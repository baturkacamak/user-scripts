// ==UserScript==
// @id           eksi-content-loader@https://github.com/baturkacamak/userscripts
// @name         EksiSözlük - Content Loader
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.6.0
// @description  Adds a button to load all consecutive pages with a progress bar, smooth transitions, a 1-second delay between requests, and keeps pagination visible on EksiSözlük.
// @author       Batur Kacamak
// @copyright    2023, Batur Kacamak (https://batur.info/)
// @match        https://eksisozluk.com/*
// @grant        none
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/eksi-content-loader#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/eksi-content-loader#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/eksi-content-loader/eksi-content-loader.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/eksi-content-loader/eksi-content-loader.user.js
// @icon         https://eksisozluk.com/favicon.ico
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const SELECTORS = Object.freeze({
        ENTRY_LIST: '#entry-item-list',
        PAGER: '.pager',
        NEXT_PAGE: '.pager .next',
        ENTRIES: '#entry-item-list > li',
        PAGE_COUNT: '.pager [title="son sayfa"]',
    });

    class ContentLoader {
        #entryList;
        #pager;
        #isLoading = false;
        #loadButton;
        #progressBar;
        #progressText;
        #currentPage;
        #totalPages;

        constructor() {
            this.#entryList = document.querySelector(SELECTORS.ENTRY_LIST);
            this.#pager = document.querySelector(SELECTORS.PAGER);
            this.#currentPage = parseInt(this.#pager.dataset.currentpage, 10);
            this.#totalPages = this.#getTotalPages();
        }

        init() {
            if (this.#entryList && this.#pager && this.#currentPage < this.#totalPages) {
                this.#createLoadButton();
                this.#createProgressBar();
                this.#addStyles();
            }
        }

        #createLoadButton() {
            this.#loadButton = document.createElement('button');
            this.#loadButton.textContent = 'Load All Content';
            this.#loadButton.className = 'load-all-button';
            this.#loadButton.addEventListener('click', () => this.#loadAllPages());
            this.#pager.parentNode.insertBefore(this.#loadButton, this.#pager);
        }

        #createProgressBar() {
            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';

            this.#progressText = document.createElement('div');
            this.#progressText.className = 'progress-text';

            this.#progressBar = document.createElement('div');
            this.#progressBar.className = 'progress-bar';

            progressContainer.appendChild(this.#progressText);
            progressContainer.appendChild(this.#progressBar);

            this.#pager.parentNode.insertBefore(progressContainer, this.#pager);
            progressContainer.style.display = 'none';
        }

        #updateProgress(loaded, total) {
            const progress = (loaded / total) * 100;
            this.#progressBar.style.width = `${progress}%`;
            this.#progressText.textContent = `Loading: ${loaded}/${total} pages`;
        }

        #getTotalPages() {
            const lastPageLink = document.querySelector(SELECTORS.PAGE_COUNT);
            return lastPageLink ? parseInt(lastPageLink.textContent, 10) : this.#currentPage;
        }

        async #loadAllPages() {
            if (this.#isLoading) return;

            this.#isLoading = true;
            this.#loadButton.style.display = 'none';
            this.#progressBar.parentElement.style.display = 'block';
            this.#updateProgress(0, this.#totalPages - this.#currentPage);

            try {
                for (let page = this.#currentPage + 1; page <= this.#totalPages; page++) {
                    const entries = await this.#loadPage(page);
                    entries.forEach(this.#appendEntry.bind(this));
                    this.#updateProgress(page - this.#currentPage, this.#totalPages - this.#currentPage);

                    // Add a 1-second delay between requests
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                this.#progressBar.parentElement.style.display = 'none';
                this.#updatePagination();
            } catch (error) {
                console.error('Error loading pages:', error);
                this.#loadButton.textContent = 'Error. Try Again';
                this.#loadButton.style.display = 'block';
                this.#progressBar.parentElement.style.display = 'none';
            } finally {
                this.#isLoading = false;
            }
        }

        async #loadPage(pageNumber) {
            const url = new URL(window.location);
            url.searchParams.set('p', pageNumber);
            const response = await fetch(url);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            return Array.from(doc.querySelectorAll(SELECTORS.ENTRIES));
        }

        #appendEntry(entry, index) {
            entry.style.opacity = '0';
            entry.style.transform = 'translateY(20px)';
            this.#reconstructFooter(entry);
            this.#entryList.appendChild(entry);
            setTimeout(() => {
                entry.style.opacity = '1';
                entry.style.transform = 'translateY(0)';
            }, index * 20);
        }

        #reconstructFooter(entry) {
            const footer = entry.querySelector('footer');
            if (footer) {
                const feedbackContainer = footer.querySelector('.feedback-container');
                if (feedbackContainer) {
                    const feedback = feedbackContainer.querySelector('.feedback');
                    if (feedback) {
                        // Add missing elements to the feedback div
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

                    // Add rate options
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

                    // Add click handlers for like and dislike buttons
                    const likeButton = rateOptions.querySelector('.like');
                    const dislikeButton = rateOptions.querySelector('.dislike');

                    likeButton.addEventListener('click', () => this.#handleVote(entry, 1));
                    dislikeButton.addEventListener('click', () => this.#handleVote(entry, -1));

                    // Add favorite links
                    const favoriteLinks = document.createElement('span');
                    favoriteLinks.className = 'favorite-links';
                    favoriteLinks.innerHTML = `
                        <a class="favorite-link" title="favorilere ekle" aria-label="favorilere ekle">
                            <svg class="eksico"><use xlink:href="#eksico-drop"></use></svg>
                        </a>
                        <a class="favorite-count toggles">${entry.dataset.favoriteCount || '0'}</a>
                        <div class="favorite-list-popup toggles-menu"><div></div></div>
                    `;
                    feedbackContainer.appendChild(favoriteLinks);

                    // Add click handler for favorite button
                    const favoriteButton = favoriteLinks.querySelector('.favorite-link');
                    favoriteButton.addEventListener('click', () => this.#handleFavorite(entry));
                }
            }
        }

        #handleVote(entry, rate) {
            const entryId = entry.dataset.id;
            const ownerId = entry.dataset.authorId;

            fetch("https://eksisozluk.com/entry/vote", {
                "headers": {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.9,tr;q=0.8,nl;q=0.7",
                    "cache-control": "no-cache",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "pragma": "no-cache",
                    "sec-ch-ua": "\"Microsoft Edge\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"macOS\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-requested-with": "XMLHttpRequest"
                },
                "referrer": window.location.href,
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": `id=${entryId}&rate=${rate}&owner=${ownerId}`,
                "method": "POST",
                "mode": "cors",
                "credentials": "include"
            })
                .then(response => response.json())
                .then(data => {
                console.log('Vote response:', data);
                // Here you can handle the response, e.g., update UI to reflect the vote
            })
                .catch(error => {
                console.error('Error voting:', error);
            });
        }

        #handleFavorite(entry) {
            const entryId = entry.dataset.id;

            fetch("https://eksisozluk.com/entry/favla", {
                "headers": {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.9,tr;q=0.8,nl;q=0.7",
                    "cache-control": "no-cache",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "pragma": "no-cache",
                    "sec-ch-ua": "\"Microsoft Edge\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"macOS\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-requested-with": "XMLHttpRequest"
                },
                "referrer": window.location.href,
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": `entryId=${entryId}`,
                "method": "POST",
                "mode": "cors",
                "credentials": "include"
            })
                .then(response => response.json())
                .then(data => {
                console.log('Favorite response:', data);
                // Here you can handle the response, e.g., update UI to reflect the favorite status
                this.#updateFavoriteUI(entry, data);
            })
                .catch(error => {
                console.error('Error favoriting:', error);
            });
        }

        #updateFavoriteUI(entry, data) {
            const favoriteLink = entry.querySelector('.favorite-link');
            const favoriteCount = entry.querySelector('.favorite-count');

            if (data.Success) {
                if (data.Success) {
                    favoriteLink.classList.add('favorited');
                    favoriteLink.title = 'favorilerden çıkar';
                } else {
                    favoriteLink.classList.remove('favorited');
                    favoriteLink.title = 'favorilere ekle';
                }

                if (favoriteCount) {
                    favoriteCount.textContent = data.Count;
                    // Update the entry's dataset
                    entry.dataset.favoriteCount = data.Count;
                }
            }
        }

        #updatePagination() {
            // Update the current page to the last page
            this.#pager.dataset.currentpage = this.#totalPages.toString();

            // Disable the "next" button
            const nextButton = this.#pager.querySelector(SELECTORS.NEXT_PAGE);
            if (nextButton) {
                nextButton.classList.add('disabled');
                nextButton.removeAttribute('href');
            }

            // Update page numbers if necessary
            const pageNumbers = this.#pager.querySelectorAll('a[data-page]');
            pageNumbers.forEach(pageNumber => {
                const pageNum = parseInt(pageNumber.dataset.page, 10);
                if (pageNum > this.#totalPages) {
                    pageNumber.style.display = 'none';
                }
            });
        }

        #addStyles() {
            const style = document.createElement('style');
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
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
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
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
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
                #entry-item-list .content, #matter-index-item-list .content, #matter-content .content, #matter-answer-content .content, #pinned-entry .content, #matter-answer-index-item-list .content, #matter-answer-list .content {
                    overflow: initial !important;
                    max-height: initial !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    const contentLoader = new ContentLoader();
    contentLoader.init();
})();
