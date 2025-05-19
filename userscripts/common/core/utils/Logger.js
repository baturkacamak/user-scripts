/**
 * Enhanced Logger - A feature-rich logging utility
 * Supports log levels, styling, grouping, caller info, filtering, persistence, exporting, and more
 */
class Logger {
    static DEBUG = true;
    static PREFIX = "Userscript";
    static _customFormat = null;
    static _logHistory = [];
    static _filters = new Set();
    static _lastTimestamp = null;
    static _persist = false;
    static _mock = false;
    static _theme = {
        debug: "color: #3498db; font-weight: bold;",
        info: "color: #1abc9c; font-weight: bold;",
        warn: "color: #f39c12; font-weight: bold;",
        error: "color: #e74c3c; font-weight: bold;",
        success: "color: #2ecc71; font-weight: bold;",
        trace: "color: #8e44ad; font-weight: bold;",
        htmlTitle: "color: #9b59b6; font-weight: bold;",
        htmlContent: "color: #2c3e50;",
        toggle: "color: #f39c12; font-weight: bold;"
    };
    static _emojis = {
        debug: "\uD83D\uDC1B",
        info: "\u2139\uFE0F",
        warn: "\u26A0\uFE0F",
        error: "\u274C",
        success: "\u2705",
        trace: "\uD83D\uDCCC",
        html: "\uD83E\uDDE9",
        toggle: "\uD83C\uDF9B\uFE0F"
    };

    static setTimeFormat(locale = "en-US", use12Hour = false) {
        this._customFormat = {locale, hour12: use12Hour};
    }

    static _detectTimeFormat() {
        try {
            const testDate = new Date(Date.UTC(2020, 0, 1, 13, 0, 0));
            const locale = navigator.language || "tr-TR";
            const timeString = testDate.toLocaleTimeString(locale);
            const is12Hour = timeString.toLowerCase().includes("pm") || timeString.toLowerCase().includes("am");
            return {locale, hour12: is12Hour};
        } catch (e) {
            return {locale: "tr-TR", hour12: false};
        }
    }

    static _timestamp() {
        const now = new Date();

        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

        const time = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}.${milliseconds}`;

        let diff = "";
        if (this._lastTimestamp) {
            const ms = now - this._lastTimestamp;
            diff = ` [+${(ms / 1000).toFixed(3)}s]`; // Keep 3 decimal places for ms in diff
        }
        this._lastTimestamp = now;
        return `${time}${diff}`;
    }

    static _getCaller() {
        const err = new Error();
        const stack = err.stack?.split("\n")[3];
        return stack ? stack.trim() : "(unknown)";
    }

    static _log(level, ...args) {
        if (!this.DEBUG && level === "debug") return;
        if (this._filters.size && !args.some(arg => this._filters.has(arg))) return;
        const emoji = this._emojis[level] || '';
        const style = this._theme[level] || '';
        const timestamp = this._timestamp();
        const caller = this._getCaller();

        const message = [
            `%c${timestamp} %c${emoji} [${this.PREFIX} ${level.toUpperCase()}]%c:`,
            "color: gray; font-style: italic;",
            style,
            "color: inherit;",
            ...args,
            `\nCaller: ${caller}`
        ];

        this._logHistory.push({timestamp, level, args});

        if (this._persist) localStorage.setItem("LoggerHistory", JSON.stringify(this._logHistory));
        if (!this._mock) console.log(...message);
    }

    static debug(...args) {
        this._log("debug", ...args);
    }

    static info(...args) {
        this._log("info", ...args);
    }

    static warn(...args) {
        this._log("warn", ...args);
    }

    static error(...args) {
        this._log("error", ...args);
    }

    static success(...args) {
        this._log("success", ...args);
    }

    static trace(...args) {
        this._log("trace", ...args);
        console.trace();
    }

    static logHtml(title, htmlContent) {
        const shortContent = htmlContent.substring(0, 1500) + "...";
        this._log("html", `[${title}]`, shortContent);
        if (!this._mock) {
            console.groupCollapsed(`%c\uD83E\uDDE9 HTML Details (${title})`, this._theme.htmlTitle);
            console.log("%cComplete HTML:", this._theme.htmlTitle);
            console.log(`%c${htmlContent}`, this._theme.htmlContent);
            console.groupEnd();
        }
    }

    static setPrefix(prefix) {
        this.PREFIX = prefix;
    }

    static setTheme(theme) {
        Object.assign(this._theme, theme);
    }

    static addFilter(tag) {
        this._filters.add(tag);
    }

    static clearFilters() {
        this._filters.clear();
    }

    static persistLogs(enable = true) {
        this._persist = enable;
    }

    static mock(enable = true) {
        this._mock = enable;
    }

    static group(label) {
        if (!this._mock) console.group(label);
    }

    static groupEnd() {
        if (!this._mock) console.groupEnd();
    }

    static step(msg) {
        this.info(`\u2705 ${msg}`);
    }

    static hello() {
        this.info("Hello, dev! \uD83D\uDC4B Ready to debug?");
    }

    static downloadLogs(filename = "logs.json") {
        const blob = new Blob([JSON.stringify(this._logHistory, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    static autoClear(intervalMs) {
        setInterval(() => {
            this._logHistory = [];
            if (this._persist) localStorage.removeItem("LoggerHistory");
        }, intervalMs);
    }
}

export default Logger;