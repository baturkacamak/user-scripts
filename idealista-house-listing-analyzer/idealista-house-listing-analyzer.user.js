// ==UserScript==
// @id           idealista-house-listing-analyzer@https://github.com/baturkacamak/userscripts
// @name         House Listing Analyzer
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.0.0
// @description  Analyzes house listing statistics and displays the calculated score on Idealista pages
// @match        https://www.idealista.com/*
// @grant        GM_addStyle
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/idealista-house-listing-analyzer#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/idealista-house-listing-analyzer#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/idealista-house-listing-analyzer/idealista-house-listing-analyzer.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/idealista-house-listing-analyzer/idealista-house-listing-analyzer.user.js
// @icon         https://idealista.com/favicon.ico
// ==/UserScript==

(() => {
  const config = {
    expirationDays: 1, // Default expiration days for cache
    delayBetweenRequests: 2000, // Delay in milliseconds between each request
    weights: {
      visits: 0.0001,
      friendShares: 0.3,
      emailContacts: 0.6,
      favorites: 0.4,
      recency: 0.2, // Increased weight for recency
    },
  };

  class DOMMutationObserver {
    constructor(callback) {
      this.observer = new MutationObserver(callback);
    }

    observe(target, selector) {
      this.observer.observe(target, {
        childList: true,
        subtree: true,
      });
    }
  }

  class HttpService {
    static get(url) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);
        xhr.setRequestHeader('Accept', '*/*');
        xhr.setRequestHeader('Accept-Language',
            'en-US,en;q=0.9,tr;q=0.8,nl;q=0.7');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        xhr.onload = function() {
          if (200 === xhr.status) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Failed to make the request'));
          }
        };

        xhr.onerror = function() {
          reject(new Error('Failed to make the request'));
        };

        xhr.send();
      });
    }
  }

  class CacheHandler {
    get(key) {
      const value = localStorage.getItem(key);
      if (null !== value) {
        const {data, expires} = JSON.parse(value);
        if (null === expires || new Date(expires) > new Date()) {
          return data;
        }
        localStorage.removeItem(key);
      }
      return null;
    }

    set(key, value, expirationDays = config.expirationDays) {
      const expires = expirationDays ?
          new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000) :
          null;
      localStorage.setItem(key, JSON.stringify({data: value, expires}));
    }
  }

  class HouseListingAnalyzer {
    constructor() {
      this.extractor = new StatisticsExtractor();
      this.scoreCalculator = new ScoreCalculator();
      this.cacheHandler = new CacheHandler();
      this.anchorElements = document.getElementsByTagName('a');
      this.domMutationObserver = new DOMMutationObserver(
          this.handleMutation.bind(this),
      );

      this.observeAnchorElements();
    }

    async init() {
      for (const anchorElement of this.anchorElements) {
        if (anchorElement.href.includes('/inmueble/')) {
          await this.calculateAndDisplayScore(anchorElement);
        }
      }
    }

    observeAnchorElements() {
      this.domMutationObserver.observe(document.documentElement, 'a');
    }

    async handleMutation(mutationsList) {
      for (const mutation of mutationsList) {
        if ('childList' !== mutation.type) {
          continue;
        }

        const {removedNodes, target} = mutation;
        if (0 === removedNodes.length || 'SECTION' === target.nodeName) {
          continue;
        }

        const anchorElements = target.querySelectorAll('a');
        for (const anchorElement of anchorElements) {
          if (!anchorElement.href.includes('/inmueble/')) {
            continue;
          }

          await this.calculateAndDisplayScore(anchorElement);
        }
      }
    }

    async calculateAndDisplayScore(anchorElement) {
      const listingId = this.extractor.extractListingId(anchorElement.href);
      const cachedScore = this.cacheHandler.get(listingId);
      if (null !== cachedScore) {
        const scoreElement = document.createElement('span');
        scoreElement.textContent = `(${cachedScore.toFixed(2)})`;
        anchorElement.appendChild(scoreElement);
      } else {
        try {
          const statistics = await this.extractor.extractStatistics(listingId);
          const daysSincePublished = this.calculateDaysSincePublished(
              statistics.dateLine,
          );
          const score = this.scoreCalculator.calculateScore(
              statistics.visits,
              statistics.friendShares,
              statistics.emailContacts,
              statistics.favorites,
              daysSincePublished,
          );
          this.cacheHandler.set(listingId, score);

          const scoreElement = document.createElement('span');
          scoreElement.textContent = `(${score.toFixed(2)})`;
          anchorElement.appendChild(scoreElement);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(error);
        }
      }
    }

    calculateDaysSincePublished(dateString) {
      if (!dateString) {
        return 0; // or any default value you prefer when dateString is null
      }
      const dateRegex = /(\d+)\s+de\s+(\w+)/;
      const [, day, month] = dateString.match(dateRegex);
      const publishedDate = new Date(
          `${month} ${day}, ${new Date().getFullYear()}`,
      );

      const currentDate = new Date();
      const timeDiff = Math.abs(
          currentDate.getTime() - publishedDate.getTime());
      return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    }
  }

  class StatisticsExtractor {
    extractListingId(url) {
      if (!url) {
        url = window.location.href;
      }

      return url.match(/\/inmueble\/(\d+)\//)[1];
    }

    async extractStatistics(listingId) {
      try {
        const response = await HttpService.get(
            `https://www.idealista.com/ajax/detailstatsview/${listingId}/`,
        );

        return this.parseStatisticsFromResponse(response);
      } catch (error) {
        throw new Error('Failed to retrieve statistics');
      }
    }

    parseStatisticsFromResponse(response) {
      const statistics = {
        visits: 0,
        friendShares: 0,
        emailContacts: 0,
        favorites: 0,
        dateLine: null,
      };

      const patternMap = {
        visits: /<strong>(\d+)<\/strong><span>visitas<\/span>/,
        friendShares: /<strong>(\d+)<\/strong><span>envíos a amigos<\/span>/,
        emailContacts: /<strong>(\d+)<\/strong><span>contactos por email<\/span>/,
        favorites: /<strong>(\d+)<\/strong>\s*<span>veces guardado como favorito<\/span>/,
        dateLine: /<p>Anuncio actualizado el (\d+ de \w+)<\/p>/,
      };

      for (const [key, pattern] of Object.entries(patternMap)) {
        const match = response.plainhtml.match(pattern);
        if (match) {
          statistics[key] = match[1];
        }
      }

      return statistics;
    }
  }

  class ScoreCalculator {
    calculateScore(
        visits, friendShares, emailContacts, favorites, daysSincePublished,
    ) {
      const weights = config.weights;

      const recencyFactor = Math.exp(-0.1 * daysSincePublished);

      return (
        visits * weights.visits +
          friendShares * weights.friendShares +
          emailContacts * weights.emailContacts +
          favorites * weights.favorites +
          recencyFactor * weights.recency
      );
    }
  }

  const houseListingAnalyzer = new HouseListingAnalyzer();
  (async () => {
    await houseListingAnalyzer.init();
  })();
})();
