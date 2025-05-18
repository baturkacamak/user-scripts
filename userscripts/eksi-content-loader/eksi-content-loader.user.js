// ==UserScript==
// @id           eksi-content-loader@https://github.com/baturkacamak/userscripts
// @name         EksiSözlük - Content Loader
// @namespace    https://github.com/baturkacamak/userscripts
// @version      2.2.0
// @description  Adds a button to load all consecutive pages with a progress bar, smooth transitions, a 1-second delay between requests, and keeps pagination visible on EksiSözlük.
// @author       Batur Kacamak (Updated by AI Assistant)
// @copyright    2024+, Batur Kacamak (https://batur.info/)
// @match        https://eksisozluk.com/*
// @grant        none
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/eksi-content-loader#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/eksi-content-loader#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/eksi-content-loader/eksi-content-loader.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/eksi-content-loader/eksi-content-loader.user.js
// @icon         https://eksisozluk.com/favicon.ico
// @run-at       document-idle
// ==/UserScript==

(() => {
    'use strict';

    const SELECTORS = Object.freeze({
        ENTRY_LIST: '#entry-item-list',
        PAGER: '.pager',
        NEXT_PAGE: '.pager .next',
        ENTRIES: '#entry-item-list > li',
        PAGE_COUNT: '.pager [title="son sayfa"]',
    });

    // DOM Utility Class
    class DOMUtils {
        static #parser = new DOMParser();

    static createElement(tag, attributes = {}, textContent = '') {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
        if (textContent) element.textContent = textContent;
        return element;
    }

    static querySelector(selector, context = document) {
        return context.querySelector(selector);
    }

    static querySelectorAll(selector, context = document) {
        return [...context.querySelectorAll(selector)];
    }

    static parseHTML(html) {
        return this.#parser.parseFromString(html, 'text/html');
    }
}

 // API Service
 class APIService {
 static #instance = null;
 #baseURL = 'https://eksisozluk.com';
 #defaultHeaders = {
 "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
 "X-Requested-With": "XMLHttpRequest"
 };

constructor() {
    if (APIService.#instance) {
        return APIService.#instance;
    }
    APIService.#instance = this;
}

static getInstance() {
    return new APIService();
}

async #fetchWithTimeout(url, options, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw error;
    }
}

async #fetchJSON(url, options) {
    try {
        const response = await this.#fetchWithTimeout(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return {success: true, data};
    } catch (error) {
        console.error('Fetch error:', error);
        return {success: false, error: error.message};
    }
}

async request(endpoint, data = {}, method = 'POST', additionalHeaders = {}) {
    const url = new URL(endpoint, this.#baseURL);
    const headers = {...this.#defaultHeaders, ...additionalHeaders};
    const body = method !== 'GET' ? new URLSearchParams(data) : undefined;

    if (method === 'GET' && Object.keys(data).length) {
        Object.entries(data).forEach(([key, value]) => url.searchParams.append(key, value));
    }

    return this.#fetchJSON(url, {
        method,
        headers,
        body,
        credentials: "include"
    });
}

vote = (entryId, rate, ownerId) => this.request("/entry/vote", {id: entryId, rate, owner: ownerId});

favorite = (entryId) => this.request("/entry/favla", {entryId});

removeFavorite = (entryId) => this.request("/entry/favlama", {entryId});
}

// UI Component base class
class UIComponent {
    #parent;
    element;

    constructor(parent) {
        this.#parent = parent;
    }

    get parent() {
        return this.#parent;
    }

    render() {
        throw new Error('Render method must be implemented');
    }

    hide = () => this.element?.style.setProperty('display', 'none');

    show = () => this.element?.style.removeProperty('display');
}

// Load Button Component
class LoadButton extends UIComponent {
    #onClick;

    constructor(parent, onClick) {
        super(parent);
        this.#onClick = onClick;
    }

    render() {
        this.element = DOMUtils.createElement('button', {
            class: 'load-all-button'
        }, 'Load All Content');
        this.element.addEventListener('click', this.#onClick);
        this.parent.insertBefore(this.element, this.parent.firstChild);
    }
}

// Progress Bar Component
class ProgressBar extends UIComponent {
    #progressText;
    #progressBar;

    render() {
        this.element = DOMUtils.createElement('div', {class: 'progress-container'});
        this.#progressText = DOMUtils.createElement('div', {class: 'progress-text'});
        this.#progressBar = DOMUtils.createElement('div', {class: 'progress-bar'});
        this.element.append(this.#progressText, this.#progressBar);
        this.parent.insertBefore(this.element, this.parent.firstChild);
        this.hide();
    }

    update(loaded, total) {
        const progress = (loaded / total) * 100;
        this.#progressBar.style.setProperty('width', `${progress}%`);
        this.#progressText.textContent = `Loading: ${loaded}/${total} pages`;
    }
}

// Entry Loader
class EntryLoader {
    #apiService;

    constructor(apiService) {
        this.#apiService = apiService;
    }

    #setupLazyLoad(element) {
        const images = element.querySelectorAll('img');
        images.forEach(img => {
            img.loading = 'lazy';
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';

            img.addEventListener('load', () => {
                img.style.opacity = '1';
            }, { once: true });
        });
    }

    async loadPage(pageNumber) {
        const url = new URL(window.location);
        url.searchParams.set('p', pageNumber);
        const response = await fetch(url);
        const text = await response.text();
        const doc = DOMUtils.parseHTML(text);
        const entries = DOMUtils.querySelectorAll(SELECTORS.ENTRIES, doc);

        // Setup lazy loading for images in each entry
        entries.forEach(entry => this.#setupLazyLoad(entry));

        return entries;
    }

    reconstructFooter(entry) {
        const footer = entry.querySelector('footer');
        if (footer) {
            const feedbackContainer = footer.querySelector('.feedback-container');
            if (feedbackContainer) {
                const feedback = feedbackContainer.querySelector('.feedback');
                if (feedback) {
                    feedback.innerHTML = `
                            <div class="entry-share dropdown">
                                <a class="entry-share dropdown-toggle toggles" title="share">
                                    <svg class="eksico" id="svg-share">
                                        <use xlink:href="#eksico-share"></use>
                                    </svg>
                                </a>
                                <ul class="dropdown-menu right toggles-menu">
                                    <!-- Add share options here -->
                                </ul>
                            </div>
                            <div class="other dropdown">
                                <a class="others dropdown-toggle toggles" title="diğer">
                                    <svg class="eksico" id="svg-dots">
                                        <use xlink:href="#eksico-dots"></use>
                                    </svg>
                                </a>
                                <ul class="dropdown-menu right toggles-menu">
                                    <!-- Add other options here -->
                                </ul>
                            </div>
                        `;
                }

                const rateOptions = document.createElement('span');
                rateOptions.className = 'rate-options';
                rateOptions.innerHTML = `
                        <a class="like" title="şükela!"><span></span>
                            <svg class="eksico" id="svg-chevron-up">
                                <use xlink:href="#eksico-chevron-up"></use>
                            </svg>
                        </a>
                        <a class="dislike" title="çok kötü"><span></span>
                            <svg class="eksico" id="svg-chevron-down">
                                <use xlink:href="#eksico-chevron-down"></use>
                            </svg>
                        </a>
                    `;
                feedbackContainer.appendChild(rateOptions);

                const likeButton = rateOptions.querySelector('.like');
                const dislikeButton = rateOptions.querySelector('.dislike');

                likeButton.addEventListener('click', () => this.#handleVote(entry, 1));
                dislikeButton.addEventListener('click', () => this.#handleVote(entry, -1));

                const favoriteLinks = document.createElement('span');
                favoriteLinks.className = 'favorite-links';
                const isFavorite = entry.dataset.isfavorite === "true";
                favoriteLinks.innerHTML = `
                    <a class="favorite-link${isFavorite ? ' favorited' : ''}" title="${isFavorite ? 'favorilerden çıkar' : 'favorilere ekle'}" aria-label="${isFavorite ? 'favorilerden çıkar' : 'favorilere ekle'}">
                        <svg class="eksico"><use xlink:href="#eksico-drop"></use></svg>
                    </a>
                    <a class="favorite-count toggles">${entry.dataset.favoriteCount || '0'}</a>
                    <div class="favorite-list-popup toggles-menu"><div></div></div>
                `;
                feedbackContainer.appendChild(favoriteLinks);

                const favoriteButton = favoriteLinks.querySelector('.favorite-link');
                favoriteButton.addEventListener('click', () => this.#handleFavorite(entry));
            }
        }
    }

    async #handleVote(entry, rate) {
        const entryId = entry.dataset.id;
        const ownerId = entry.dataset.authorId;

        try {
            const data = await this.#apiService.vote(entryId, rate, ownerId);
            console.log('Vote response:', data);
            // Here you can handle the response, e.g., update UI to reflect the vote
            this.#updateVoteUI(entry, data);
        } catch (error) {
            console.error('Error voting:', error);
        }
    }

    async #handleFavorite(entry) {
        const entryId = entry.dataset.id;
        const favoriteLink = entry.querySelector('.favorite-link');
        const isFavorited = favoriteLink.classList.contains('favorited');

        try {
            let response;
            if (isFavorited) {
                response = await this.#apiService.removeFavorite(entryId);
            } else {
                response = await this.#apiService.favorite(entryId);
            }

            if (response.success) {
                // Use the Count directly from the API response
                this.#updateFavoriteUI(entry, {
                    Success: response.data.Success,
                    Count: response.data.Count
                }, !isFavorited);
            }
        } catch (error) {
            console.error('Error handling favorite:', error);
        }
    }

    #updateFavoriteUI(entry, data, isFavorited) {
        const favoriteLink = entry.querySelector('.favorite-link');
        const favoriteCount = entry.querySelector('.favorite-count');

        if (data.Success) {
            // Toggle favorite state
            favoriteLink.classList.toggle('favorited', isFavorited);

            // Update title and aria-label
            const newTitle = isFavorited ? 'favorilerden çıkar' : 'favorilere ekle';
            favoriteLink.title = newTitle;
            favoriteLink.setAttribute('aria-label', newTitle);

            // Update count using the API response count
            if (favoriteCount && typeof data.Count === 'number') {
                favoriteCount.textContent = data.Count.toString();
                entry.dataset.favoriteCount = data.Count.toString();
            }

            // Update the entry's favorite state
            entry.dataset.isfavorite = isFavorited.toString();
        }
    }

    #updateVoteUI(entry, data) {
        const likeButton = entry.querySelector('.like');
        const dislikeButton = entry.querySelector('.dislike');

        if (data.Success) {
            if (data.Vote > 0) {
                likeButton.classList.add('voted');
                dislikeButton.classList.remove('voted');
            } else if (data.Vote < 0) {
                dislikeButton.classList.add('voted');
                likeButton.classList.remove('voted');
            } else {
                likeButton.classList.remove('voted');
                dislikeButton.classList.remove('voted');
            }
        }
    }

    appendEntry(entryList, entry, index) {
        entry.style.setProperty('opacity', '0');
        entry.style.setProperty('transform', 'translateY(20px)');
        this.reconstructFooter(entry);
        entryList.appendChild(entry);
        setTimeout(() => {
            entry.style.setProperty('opacity', '1');
            entry.style.setProperty('transform', 'translateY(0)');
        }, index * 20);
    }
}

// Pagination Manager
class PaginationManager {
    #pager;

    constructor(pager) {
        this.#pager = pager;
    }

    getCurrentPage = () => parseInt(this.#pager.dataset.currentpage, 10);

    getTotalPages() {
        const lastPageLink = DOMUtils.querySelector(SELECTORS.PAGE_COUNT);
        return lastPageLink ? parseInt(lastPageLink.textContent, 10) : this.getCurrentPage();
    }

    updatePagination(totalPages) {
        this.#pager.dataset.currentpage = totalPages.toString();

        const nextButton = this.#pager.querySelector(SELECTORS.NEXT_PAGE);
        if (nextButton) {
            nextButton.classList.add('disabled');
            nextButton.removeAttribute('href');
        }

        DOMUtils.querySelectorAll('a[data-page]', this.#pager).forEach(pageNumber => {
            const pageNum = parseInt(pageNumber.dataset.page, 10);
            pageNumber.style.setProperty('display', pageNum > totalPages ? 'none' : '');
        });
    }
}

// Main Content Loader class
class ContentLoader {
    #entryList;
    #pager;
    #paginationManager;
    #currentPage;
    #totalPages;
    #entryLoader;
    #apiService;
    #loadButton;
    #progressBar;
    #isLoading = false;

    constructor() {
        this.#entryList = DOMUtils.querySelector(SELECTORS.ENTRY_LIST);
        this.#pager = DOMUtils.querySelector(SELECTORS.PAGER);
        this.#paginationManager = new PaginationManager(this.#pager);
        this.#currentPage = this.#paginationManager.getCurrentPage();
        this.#totalPages = this.#paginationManager.getTotalPages();
        this.#apiService = APIService.getInstance();
        this.#entryLoader = new EntryLoader(this.#apiService);
    }

    init() {
        if (this.#entryList && this.#pager && this.#currentPage < this.#totalPages) {
            this.#loadButton = new LoadButton(this.#pager.parentNode, () => this.#loadAllPages());
            this.#progressBar = new ProgressBar(this.#pager.parentNode);
            this.#loadButton.render();
            this.#progressBar.render();
            this.#addStyles();
        }
    }

    async #loadAllPages() {
        if (this.#isLoading) return;

        this.#isLoading = true;
        this.#loadButton.hide();
        this.#progressBar.show();
        this.#progressBar.update(0, this.#totalPages - this.#currentPage);

        try {
            for (let page = this.#currentPage + 1; page <= this.#totalPages; page++) {
                const entries = await this.#entryLoader.loadPage(page);
                entries.forEach((entry, index) => this.#entryLoader.appendEntry(this.#entryList, entry, index));
                this.#progressBar.update(page - this.#currentPage, this.#totalPages - this.#currentPage);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            this.#progressBar.hide();
            this.#paginationManager.updatePagination(this.#totalPages);
        } catch (error) {
            console.error('Error loading pages:', error);
            this.#loadButton.element.textContent = 'Error. Try Again';
            this.#loadButton.show();
            this.#progressBar.hide();
        } finally {
            this.#isLoading = false;
        }
    }

    #addStyles() {
        const style = DOMUtils.createElement('style');
        style.textContent = `
                    .load-all-button {
                    display: inline-block;
                    margin: 0 auto;
                    padding: 0 0 0 20px;
                    background-color: #2d2d2d;
                    color: #bdbdbd;
                    border: none;
                    border-radius: 25px;
                    cursor: pointer;
                    font-size: 16px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .load-all-button:hover {
                    background-color: transparent !important;
                }
                .load-all-button:disabled {
                    background-color: #6d6d6d;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                #entry-item-list > li {
                    transition: opacity 0.5s ease, transform 0.5s ease;
                }
                .progress-container {
                    width: 100%;
                    height: 20px;
                    background-color: #f3f3f3;
                    border-radius: 10px;
                    margin: 20px 0;
                    overflow: hidden;
                    position: relative;
                    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                .progress-bar {
                    width: 0;
                    height: 100%;
                    background: linear-gradient(90deg, #4CAF50, #45a049);
                    transition: width 0.5s ease;
                    position: relative;
                    overflow: hidden;
                }
                .progress-bar::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0.1) 25%,
                        transparent 25%,
                        transparent 50%,
                        rgba(255, 255, 255, 0.1) 50%,
                        rgba(255, 255, 255, 0.1) 75%,
                        transparent 75%,
                        transparent 100%
                    );
                    background-size: 30px 30px;
                    animation: stripes 1s linear infinite;
                }
                .progress-text {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #333;
                    font-size: 14px;
                    font-weight: bold;
                    text-shadow: 0 1px 1px rgba(255, 255, 255, 0.7);
                    z-index: 1;
                }
                @keyframes stripes {
                    0% {
                        background-position: 0 0;
                    }
                    100% {
                        background-position: 30px 0;
                    }
                }
                #entry-item-list .content,
                #matter-index-item-list .content,
                #matter-content .content,
                #matter-answer-content .content,
                #pinned-entry .content,
                #matter-answer-index-item-list .content,
                #matter-answer-list .content {
                    overflow: initial !important;
                    max-height: initial !important;
                }
            `;
        document.head.appendChild(style);
    }
}

// Initialize the content loader
const contentLoader = new ContentLoader();
contentLoader.init();
})();
