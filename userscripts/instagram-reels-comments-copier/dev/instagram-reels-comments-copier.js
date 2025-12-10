import {
    Logger,
    SidebarPanel,
    StyleManager,
    Debouncer,
    UrlChangeWatcher,
    PollingStrategy,
    ClipboardService,
    HTMLUtils,
    ViewportStabilizer
} from "../../common/core";
import { getValue, setValue } from "../../common/core/utils/GMFunctions";

// Basic logger setup
Logger.setPrefix("IG Reels Comments");
Logger.DEBUG = true;

const PANEL_NAMESPACE = "ig-reels-comments";
const SETTINGS_KEY = "ig-reels-comments-settings";

const DEFAULT_SETTINGS = {
    preferNetwork: true,
    autoScroll: true,
    includeReplies: true,
    dedupe: true,
    autoCopyOnFinish: true,
    attachObserver: true,
    maxScrollRounds: 40,
    scrollDelay: 650,
    scrollStep: 800
};

class InstagramReelsCommentsCopier {
    constructor() {
        this.comments = new Map();
        this.commentContainer = null;
        this.domObserver = null;
        this.debouncedDomScan = Debouncer.debounce(() => this.scanDomAndUpdate(), 500);
        this.urlWatcher = new UrlChangeWatcher([new PollingStrategy(this.handleUrlChange.bind(this), 900)], true);
        this.vpStabilizer = new ViewportStabilizer({
            scrollContainer: null,
            stableDurationMs: 800,
            checkIntervalMs: 200,
            maxWaitMs: 12000,
            enableDebugLogging: Logger.DEBUG,
            logger: Logger
        });
        this.state = {
            scrolling: false,
            lastSource: "none",
            lastUpdate: null,
            noNewRounds: 0,
            currentUrl: location.href
        };
        this.settings = { ...DEFAULT_SETTINGS };
        this.ui = {};
        this.networkPatched = false;
        this.containerLocatorInterval = null;
        this.globalObserver = null;

        this.init();
    }

    async init() {
        await this.loadSettings();
        this.injectStyles();
        await this.setupPanel();
        this.installNetworkSniffer();
        this.startUrlWatcher();
        this.tryAttachContainerWatcher();
        this.scanDomAndUpdate();
    }

    async loadSettings() {
        try {
            const saved = await getValue(SETTINGS_KEY, DEFAULT_SETTINGS);
            this.settings = { ...DEFAULT_SETTINGS, ...saved };
        } catch (err) {
            Logger.warn("Unable to load settings", err);
            this.settings = { ...DEFAULT_SETTINGS };
        }
    }

    async persistSettings() {
        try {
            await setValue(SETTINGS_KEY, this.settings);
        } catch (err) {
            Logger.warn("Unable to save settings", err);
        }
    }

    injectStyles() {
        const base = PANEL_NAMESPACE;
        StyleManager.addStyles(`
            .${base}-section { margin-bottom: 12px; }
            .${base}-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
            .${base}-row button { flex: 1; min-width: 120px; padding: 10px 12px; border: 1px solid #cfd3dc; border-radius: 8px; cursor: pointer; background: #f6f7fb; color: #111; font-weight: 600; }
            .${base}-row button:hover { background: #e9ebf3; }
            .${base}-row button:disabled { opacity: 0.55; cursor: not-allowed; color: #666; }
            .${base}-row button:disabled:hover { background: #f6f7fb; }
            .${base}-options label { display: flex; align-items: center; gap: 6px; margin: 4px 0; }
            .${base}-options input[type="number"] { width: 90px; padding: 4px; }
            .${base}-preview { width: 100%; }
            .${base}-preview textarea { width: 100%; min-height: 220px; padding: 10px; border-radius: 8px; border: 1px solid #ccc; background: #fff; color: #111; resize: vertical; font-family: monospace; line-height: 1.5; box-sizing: border-box; }
            .${base}-preview textarea::selection { background: #ffe69b; }
            .${base}-stat { font-size: 13px; color: #222; margin: 4px 0; font-weight: 500; }
            .${base}-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 8px; background: #eef0f5; color: #111; margin-right: 6px; border: 1px solid #d8dce5; }
            .${base}-tag { font-size: 12px; color: #222; background: #e6edff; padding: 2px 6px; border-radius: 6px; }
            .${base}-hint { font-size: 12px; color: #333; margin-top: 8px; line-height: 1.5; }
            .${base}-content { color: #111; }
            .${base}-content input, .${base}-content label { color: #111; }
        `, `${base}-styles`);
    }

    async setupPanel() {
        SidebarPanel.initStyles(PANEL_NAMESPACE);
        this.sidebarPanel = new SidebarPanel({
            id: `${PANEL_NAMESPACE}-panel`,
            namespace: PANEL_NAMESPACE,
            title: "Reels Comments Copier",
            position: SidebarPanel.PANEL_POSITIONS.RIGHT,
            transition: SidebarPanel.PANEL_TRANSITIONS.SLIDE,
            buttonIcon: "💬",
            style: {
                width: "360px",
                buttonBg: "#ff3e8f",
                buttonBgHover: "#e03170"
            },
            content: { generator: () => this.buildPanelContent() }
        });
        await this.sidebarPanel.init();
    }

    buildPanelContent() {
        const wrapper = document.createElement("div");
        wrapper.className = `${PANEL_NAMESPACE}-content`;
        wrapper.innerHTML = `
            <div class="${PANEL_NAMESPACE}-section">
                <div class="${PANEL_NAMESPACE}-stat"><span class="${PANEL_NAMESPACE}-badge">Found <strong data-field="count">0</strong></span><span class="${PANEL_NAMESPACE}-badge">Source <strong data-field="source">none</strong></span></div>
                <div class="${PANEL_NAMESPACE}-stat">Last update: <strong data-field="updated">–</strong></div>
                <div class="${PANEL_NAMESPACE}-stat">Current URL: <span data-field="url">${HTMLUtils.escapeHTML(location.href)}</span></div>
            </div>
            <div class="${PANEL_NAMESPACE}-section ${PANEL_NAMESPACE}-row">
                <button data-action="rescan">Rescan DOM</button>
                <button data-action="scroll">Start auto-scroll</button>
                <button data-action="stop" disabled>Stop</button>
                <button data-action="copy">Copy</button>
                <button data-action="clear">Clear</button>
            </div>
            <div class="${PANEL_NAMESPACE}-section ${PANEL_NAMESPACE}-options">
                <label><input type="checkbox" data-setting="preferNetwork"> Prefer network JSON</label>
                <label><input type="checkbox" data-setting="autoScroll"> Auto-scroll while attached</label>
                <label><input type="checkbox" data-setting="attachObserver"> Watch DOM for new comments</label>
                <label><input type="checkbox" data-setting="includeReplies"> Include replies</label>
                <label><input type="checkbox" data-setting="dedupe"> Deduplicate</label>
                <label><input type="checkbox" data-setting="autoCopyOnFinish"> Auto-copy when scroll stops</label>
                <div class="${PANEL_NAMESPACE}-row">
                    <label>Max scroll rounds <input type="number" min="1" max="300" step="1" data-setting="maxScrollRounds"></label>
                    <label>Scroll delay (ms) <input type="number" min="200" max="5000" step="50" data-setting="scrollDelay"></label>
                    <label>Scroll step (px) <input type="number" min="200" max="2000" step="50" data-setting="scrollStep"></label>
                </div>
            </div>
            <div class="${PANEL_NAMESPACE}-section ${PANEL_NAMESPACE}-preview">
                <textarea data-field="preview" readonly placeholder="Collected comments will appear here..."></textarea>
                <div class="${PANEL_NAMESPACE}-hint">
                    Network-first: intercepts Instagram GraphQL comment payloads. DOM fallback: finds span[dir=auto] with "For you" then grabs second div under its ancestor &lt;ul&gt; to parse comment text. Use auto-scroll to load more batches.
                </div>
            </div>
        `;

        this.ui = {
            wrapper,
            count: wrapper.querySelector('[data-field="count"]'),
            source: wrapper.querySelector('[data-field="source"]'),
            updated: wrapper.querySelector('[data-field="updated"]'),
            url: wrapper.querySelector('[data-field="url"]'),
            preview: wrapper.querySelector('[data-field="preview"]'),
            buttons: {
                rescan: wrapper.querySelector('button[data-action="rescan"]'),
                scroll: wrapper.querySelector('button[data-action="scroll"]'),
                stop: wrapper.querySelector('button[data-action="stop"]'),
                copy: wrapper.querySelector('button[data-action="copy"]'),
                clear: wrapper.querySelector('button[data-action="clear"]')
            },
            inputs: {
                preferNetwork: wrapper.querySelector('input[data-setting="preferNetwork"]'),
                autoScroll: wrapper.querySelector('input[data-setting="autoScroll"]'),
                includeReplies: wrapper.querySelector('input[data-setting="includeReplies"]'),
                dedupe: wrapper.querySelector('input[data-setting="dedupe"]'),
                autoCopyOnFinish: wrapper.querySelector('input[data-setting="autoCopyOnFinish"]'),
                attachObserver: wrapper.querySelector('input[data-setting="attachObserver"]'),
                maxScrollRounds: wrapper.querySelector('input[data-setting="maxScrollRounds"]'),
                scrollDelay: wrapper.querySelector('input[data-setting="scrollDelay"]'),
                scrollStep: wrapper.querySelector('input[data-setting="scrollStep"]')
            }
        };

        this.bindUiEvents();
        this.applySettingsToUi();
        return wrapper;
    }

    bindUiEvents() {
        const { buttons, inputs } = this.ui;

        buttons.rescan?.addEventListener("click", () => this.scanDomAndUpdate());
        buttons.copy?.addEventListener("click", () => this.copyComments());
        buttons.clear?.addEventListener("click", () => this.clearComments());
        buttons.scroll?.addEventListener("click", () => this.startAutoScroll());
        buttons.stop?.addEventListener("click", () => this.stopAutoScroll());

        Object.entries(inputs).forEach(([key, input]) => {
            if (!input) return;
            if (input.type === "checkbox") {
                input.addEventListener("change", () => {
                    this.settings[key] = input.checked;
                    this.persistSettings();
                    if (key === "attachObserver") {
                        this.tryAttachContainerWatcher(true);
                    }
                });
            } else {
                input.addEventListener("change", () => {
                    const val = Number(input.value);
                    if (!Number.isNaN(val)) {
                        this.settings[key] = val;
                        this.persistSettings();
                    }
                });
            }
        });
    }

    applySettingsToUi() {
        const { inputs } = this.ui;
        if (!inputs) return;
        inputs.preferNetwork.checked = this.settings.preferNetwork;
        inputs.autoScroll.checked = this.settings.autoScroll;
        inputs.includeReplies.checked = this.settings.includeReplies;
        inputs.dedupe.checked = this.settings.dedupe;
        inputs.autoCopyOnFinish.checked = this.settings.autoCopyOnFinish;
        inputs.attachObserver.checked = this.settings.attachObserver;
        inputs.maxScrollRounds.value = this.settings.maxScrollRounds;
        inputs.scrollDelay.value = this.settings.scrollDelay;
        inputs.scrollStep.value = this.settings.scrollStep;
    }

    updateUi() {
        const count = this.comments.size;
        if (this.ui.count) this.ui.count.textContent = String(count);
        if (this.ui.source) this.ui.source.textContent = this.state.lastSource;
        if (this.ui.updated) this.ui.updated.textContent = this.state.lastUpdate ? new Date(this.state.lastUpdate).toLocaleTimeString() : "–";
        if (this.ui.url) this.ui.url.textContent = location.href;
        if (this.ui.preview) this.ui.preview.value = this.formatCommentsForClipboard();

        if (this.ui.buttons?.scroll) {
            this.ui.buttons.scroll.disabled = this.state.scrolling;
        }
        if (this.ui.buttons?.stop) {
            this.ui.buttons.stop.disabled = !this.state.scrolling;
        }
    }

    startUrlWatcher() {
        this.urlWatcher.start();
        this.globalObserver = new MutationObserver(() => this.debouncedDomScan());
        this.globalObserver.observe(document.body, { childList: true, subtree: true });
        Logger.info("Instagram Reels Comments Copier initialized");
    }

    handleUrlChange(newUrl, oldUrl) {
        if (newUrl === oldUrl) return;
        this.state.currentUrl = newUrl;
        this.clearComments(false);
        this.tryAttachContainerWatcher(true);
        this.scanDomAndUpdate();
        if (this.ui.url) this.ui.url.textContent = newUrl;
    }

    installNetworkSniffer() {
        if (this.networkPatched) return;
        this.networkPatched = true;
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const res = await originalFetch(...args);
            this.handleNetworkResponse(res.clone(), args[0]);
            return res;
        };

        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this._igrcUrl = url;
            return originalOpen.call(this, method, url, ...rest);
        };
        XMLHttpRequest.prototype.send = function(body) {
            this.addEventListener("load", () => {
                try {
                    const contentType = this.getResponseHeader("content-type") || "";
                    if (!contentType.includes("application/json")) return;
                    const data = JSON.parse(this.responseText);
                    window.__igrc?.handleNetworkJSON(data, this._igrcUrl || "");
                } catch (err) {
                    // ignore parse errors
                }
            });
            return originalSend.call(this, body);
        };

        window.__igrc = this;
    }

    async handleNetworkResponse(response, url) {
        try {
            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) return;
            const data = await response.json();
            this.handleNetworkJSON(data, url);
        } catch (err) {
            Logger.debug("Network response ignored", err);
        }
    }

    handleNetworkJSON(data, url = "") {
        if (!this.settings.preferNetwork) return;
        if (!/graphql|api/i.test(url) && !this.looksLikeCommentPayload(data)) return;
        const comments = this.extractCommentsFromObject(data, "network");
        if (comments.length) {
            this.addComments(comments, "network");
        }
    }

    looksLikeCommentPayload(data) {
        if (!data || typeof data !== "object") return false;
        return JSON.stringify(Object.keys(data)).includes("comment");
    }

    extractCommentsFromObject(node, source) {
        const results = [];
        const visited = new WeakSet();
        const walk = (value) => {
            if (!value || typeof value !== "object") return;
            if (visited.has(value)) return;
            visited.add(value);

            const normalized = this.normalizeComment(value, source);
            if (normalized) {
                results.push(normalized);
            }

            if (Array.isArray(value)) {
                value.forEach(walk);
            } else {
                Object.values(value).forEach(walk);
                if (value.edges && Array.isArray(value.edges)) {
                    value.edges.forEach(edge => walk(edge.node || edge));
                }
                if (value.items && Array.isArray(value.items)) {
                    value.items.forEach(walk);
                }
            }
        };
        walk(node);
        return results;
    }

    normalizeComment(node, source) {
        const text = node.text || node.caption?.text;
        const username = node.username || node.user?.username || node.owner?.username;
        if (!text || !username) return null;
        const id = node.id || node.pk || node.comment_id || `${username}:${text.slice(0, 30)}`;
        const timestamp = node.created_at || node.created_at_utc || node.created_time || null;
        const isReply = Boolean(node.parent_comment_id || node.parent_comment || node.parent_id);
        if (!this.settings.includeReplies && isReply) return null;
        return { id, username, text: String(text).trim(), timestamp, source: source || "network", isReply };
    }

    tryAttachContainerWatcher(force = false) {
        if (this.containerLocatorInterval && !force) return;
        if (this.containerLocatorInterval) clearInterval(this.containerLocatorInterval);
        this.containerLocatorInterval = setInterval(() => {
            const container = this.findCommentContainer();
            if (container) {
                if (this.commentContainer !== container) {
                    this.commentContainer = container;
                    this.attachDomObserver(container);
                }
                if (!this.state.scrolling && this.settings.autoScroll) {
                    this.startAutoScroll();
                }
                if (!this.settings.attachObserver) {
                    clearInterval(this.containerLocatorInterval);
                    this.containerLocatorInterval = null;
                }
            }
        }, 1500);
    }

    findCommentContainer() {
        if (!this.isReelsExperience()) return null;
        const spans = Array.from(document.querySelectorAll('span[dir="auto"]'));
        const target = spans.find(el => (el.textContent || "").trim().toLowerCase() === "for you");
        const ul = target ? target.closest("ul") : null;
        if (!ul) return null;
        const divs = ul.querySelectorAll(":scope > div");
        if (divs.length >= 2) {
            return divs[1];
        }
        return ul;
    }

    attachDomObserver(container) {
        if (this.domObserver) this.domObserver.disconnect();
        if (!container || !this.settings.attachObserver) return;
        this.domObserver = new MutationObserver(() => this.debouncedDomScan());
        this.domObserver.observe(container, { childList: true, subtree: true });
        this.scanDomAndUpdate();
    }

    scanDomAndUpdate() {
        if (!this.isReelsExperience()) return;
        const container = this.commentContainer || this.findCommentContainer();
        if (!container) return;
        const comments = this.extractCommentsFromDom(container);
        if (comments.length) {
            this.addComments(comments, "dom");
        }
    }

    extractCommentsFromDom(container) {
        const results = [];
        const candidates = container.querySelectorAll("li, div[role='listitem'], div[role='group'], section div");
        candidates.forEach(node => {
            const username = this.extractUsername(node);
            const text = this.extractTextFromNode(node, username);
            if (!text) return;
            const timestamp = this.extractTimestamp(node);
            const id = node.getAttribute("data-comment-id") || `${username}:${text.slice(0, 30)}`;
            const isReply = Boolean(node.closest("ul ul, li li"));
            if (!this.settings.includeReplies && isReply) return;
            if (username || text) {
                results.push({ id, username: username || "anon", text, timestamp, source: "dom", isReply });
            }
        });
        return results;
    }

    extractUsername(node) {
        const anchor = node.querySelector("a[role='link'], a[href^='/']");
        const spanUser = anchor ? anchor.querySelector("span[dir='auto']") : null;
        const raw = (spanUser || anchor || node.querySelector("h3 span[dir='auto']"))?.textContent || "";
        const username = raw.trim();
        if (!username || /\s/.test(username) && username.length > 18) return null;
        return username;
    }

    extractTextFromNode(node, username) {
        const spans = Array.from(node.querySelectorAll("span[dir='auto']"));
        const texts = spans
            .map(el => el.textContent?.trim() || "")
            .filter(Boolean)
            .filter(text => text.toLowerCase() !== "for you")
            .filter(text => text !== username);
        return texts.join(" ").trim();
    }

    extractTimestamp(node) {
        const time = node.querySelector("time");
        if (!time) return null;
        const dt = time.getAttribute("datetime");
        if (dt) return Date.parse(dt);
        return null;
    }

    addComments(list, source) {
        if (!list.length) return;
        let added = 0;
        list.forEach(item => {
            const key = this.settings.dedupe ? (item.id || `${item.username}:${item.text}`) : `${item.username}:${Math.random()}`;
            if (!this.comments.has(key)) {
                this.comments.set(key, item);
                added++;
            }
        });
        if (added) {
            this.state.lastSource = source;
            this.state.lastUpdate = Date.now();
            this.state.noNewRounds = 0;
            this.updateUi();
        } else {
            this.state.noNewRounds += 1;
        }
        if (this.settings.autoCopyOnFinish && !this.state.scrolling) {
            this.copyComments(false);
        }
    }

    formatCommentsForClipboard() {
        const rows = [];
        let idx = 1;
        for (const comment of this.comments.values()) {
            const ts = comment.timestamp ? ` | ${new Date(comment.timestamp * (comment.timestamp > 2e12 ? 1 : 1000)).toLocaleString()}` : "";
            rows.push(`${idx}. ${comment.username || "anon"}: ${comment.text}${ts}`);
            idx++;
        }
        return rows.join("\n");
    }

    async copyComments(showToast = true) {
        const text = this.formatCommentsForClipboard();
        if (!text) return;
        const ok = await ClipboardService.copyToClipboard(text);
        if (ok && showToast) {
            Logger.info(`Copied ${this.comments.size} comments`);
        }
    }

    clearComments(updateUi = true) {
        this.comments.clear();
        this.state.lastSource = "none";
        this.state.lastUpdate = null;
        if (updateUi) this.updateUi();
    }

    async startAutoScroll() {
        if (this.state.scrolling) return;
        this.state.scrolling = true;
        this.updateUi();
        const container = this.commentContainer || this.findCommentContainer();
        if (!container) {
            this.state.scrolling = false;
            this.updateUi();
            return;
        }
        const maxRounds = this.settings.maxScrollRounds;
        const delay = this.settings.scrollDelay;
        for (let i = 0; i < maxRounds && this.state.scrolling; i++) {
            container.scrollBy({ top: this.settings.scrollStep, behavior: "smooth" });
            await this.vpStabilizer.waitForStability(container);
            this.scanDomAndUpdate();
            await this.sleep(delay);
            if (this.state.noNewRounds > 2) break;
        }
        this.state.scrolling = false;
        this.updateUi();
        if (this.settings.autoCopyOnFinish) {
            this.copyComments(false);
        }
    }

    stopAutoScroll() {
        this.state.scrolling = false;
        this.updateUi();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isReelsExperience() {
        return /\/reel\//.test(location.pathname) || document.querySelector("video[src*='reel']") || document.querySelector("div[role='dialog'] video");
    }
}

(function bootstrap() {
    if (window.__igReelsCommentsCopier) return;
    window.__igReelsCommentsCopier = new InstagramReelsCommentsCopier();
})();
