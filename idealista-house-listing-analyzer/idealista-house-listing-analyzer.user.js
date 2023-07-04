// ==UserScript==
// @id           idealista-house-listing-analyzer@https://github.com/baturkacamak/userscripts
// @name         House Listing Analyzer
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.0.0
// @description  Analyzes house listing statistics and displays the calculated score on Idealista pages
// @match        https://www.idealista.com/inmueble/*
// @grant        GM_addStyle
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/idealista-house-listing-analyzer#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/idealista-house-listing-analyzer#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/idealista-house-listing-analyzer/idealista-house-listing-analyzer.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/idealista-house-listing-analyzer/idealista-house-listing-analyzer.user.js
// @icon         https://idealista.com/favicon.ico
// ==/UserScript==

class CacheHandler {
    get(key) {
        const value = localStorage.getItem(key);
        if (value !== null) {
            const { data, expires } = JSON.parse(value);
            if (expires === null || new Date(expires) > new Date()) {
                return data;
            } else {
                localStorage.removeItem(key);
            }
        }
        return null;
    }

    set(key, value, expirationDays = 2) {
        const expires = expirationDays ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000) : null;
        localStorage.setItem(key, JSON.stringify({ data: value, expires: expires }));
    }
}


class HouseListingAnalyzer {
    constructor() {
        this.extractor = new StatisticsExtractor();
        this.scoreCalculator = new ScoreCalculator();
        this.scoreDisplay = new ScoreDisplay();
        this.cacheHandler = new CacheHandler();
        this.init();
    }

    init() {
        const listingId = this.extractor.extractListingId();
        const cachedScore = this.cacheHandler.get(listingId);
        if (cachedScore !== null) {
            this.scoreDisplay.displayScore(cachedScore);
        } else {
            this.extractor.extractStatistics(listingId)
                .then((statistics) => {
                    const daysSincePublished = this.calculateDaysSincePublished(statistics.dateLine);
                    const score = this.scoreCalculator.calculateScore(
                        statistics.visits,
                        statistics.friendShares,
                        statistics.emailContacts,
                        statistics.favorites,
                        daysSincePublished
                    );
                    this.cacheHandler.set(listingId, score);
                    this.scoreDisplay.displayScore(score);
                })
                .catch((error) => {
                    console.error(error);
                });
        }
    }

    calculateDaysSincePublished(dateString) {
        const dateRegex = /(\d+)\s+de\s+(\w+)/;
        const [, day, month] = dateString.match(dateRegex);
        const publishedDate = new Date(`${month} ${day}, ${new Date().getFullYear()}`);

        const currentDate = new Date();
        const timeDiff = Math.abs(currentDate.getTime() - publishedDate.getTime());
        return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    }
}

class StatisticsExtractor {
    extractListingId() {
        const listingId = window.location.href.match(/\/inmueble\/(\d+)\//)[1];
        return listingId;
    }

    extractStatistics(listingId) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const url = `https://www.idealista.com/ajax/detailstatsview/${listingId}/`;

            xhr.open("GET", url, true);
            xhr.setRequestHeader("Accept", "*/*");
            xhr.setRequestHeader("Accept-Language", "en-US,en;q=0.9,tr;q=0.8,nl;q=0.7");
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

            xhr.onload = function() {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);

                    const dateLineMatch = response.plainhtml.match(/<p>Anuncio actualizado el (\d+ de \w+)<\/p>/);
                    const dateLine = dateLineMatch ? dateLineMatch[1] : null;

                    const visitsMatch = response.plainhtml.match(/<strong>(\d+)<\/strong><span>visitas<\/span>/);
                    const visits = visitsMatch ? parseInt(visitsMatch[1]) : 0;

                    const friendSharesMatch = response.plainhtml.match(/<strong>(\d+)<\/strong><span>envíos a amigos<\/span>/);
                    const friendShares = friendSharesMatch ? parseInt(friendSharesMatch[1]) : 0;

                    const emailContactsMatch = response.plainhtml.match(/<strong>(\d+)<\/strong><span>contactos por email<\/span>/);
                    const emailContacts = emailContactsMatch ? parseInt(emailContactsMatch[1]) : 0;

                    const favoritesMatch = response.plainhtml.match(/<strong>(\d+)<\/strong>\s*<span>veces guardado como favorito<\/span>/);
                    const favorites = favoritesMatch ? parseInt(favoritesMatch[1]) : 0;

                    resolve({ visits, friendShares, emailContacts, favorites, dateLine });
                } else {
                    reject(new Error("Failed to retrieve statistics"));
                }
            };

            xhr.onerror = function() {
                reject(new Error("Failed to make the request"));
            };

            xhr.send();
        });
    }
}

class ScoreCalculator {
    calculateScore(visits, friendShares, emailContacts, favorites, daysSincePublished) {
        const weights = {
            visits: 0.1,
            friendShares: 0.2,
            emailContacts: 0.4,
            favorites: 0.3,
            recency: 0.1, // Adjusted weight for recency
        };

        const recencyFactor = 1 / (1 + Math.sqrt(daysSincePublished));

        return (
            visits * weights.visits +
            friendShares * weights.friendShares +
            emailContacts * weights.emailContacts +
            favorites * weights.favorites -
            recencyFactor * weights.recency
        );
    }
}

class ScoreDisplay {
    displayScore(score) {
        const scoreDisplay = document.createElement("div");
        scoreDisplay.textContent = "Score: " + score.toFixed(2);
        scoreDisplay.style.position = "fixed";
        scoreDisplay.style.top = "10px";
        scoreDisplay.style.right = "10px";
        scoreDisplay.style.padding = "10px";
        scoreDisplay.style.backgroundColor = "#333";
        scoreDisplay.style.color = "#fff";
        scoreDisplay.style.fontFamily = "Arial, sans-serif";
        scoreDisplay.style.fontSize = "16px";
        scoreDisplay.style.zIndex = "9999";

        document.body.appendChild(scoreDisplay);
    }
}

const houseListingAnalyzer = new HouseListingAnalyzer();
