// ==UserScript==
// @name         Copy Tracklist Data to Clipboard
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.0.0
// @description  Adds a button to copy the tracklist data as "artist name - track name" to the clipboard
// @author       Batur Kacamak
// @copyright    2023, Batur Kacamak (https://batur.info/)
// @license      MIT
// @match        https://www.discogs.com/*
// @grant        none
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/copy-tracklist-data#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/copy-tracklist-data#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/copy-tracklist-data/copy-tracklist-data.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/copy-tracklist-data/copy-tracklist-data.user.js
// @icon         https://discogs.com/favicon.ico
// @run-at       document-idle
// ==/UserScript==


class TracklistDataCopier {
    constructor() {
        this.tracklistTable = document.querySelector('[class^="tracklist"]');
        this.tracklistRows = this.tracklistTable ? this.tracklistTable.querySelectorAll('tbody tr') : [];
        this.tracklistData = '';
    }

    copyTracklistData() {
        this.tracklistData = '';

        this.tracklistRows.forEach((row) => {
            const artist = this.extractTextContent(row, '[class^="artist"] a');
            const trackTitle = this.extractTextContent(row, '[class^="trackTitle"] span');

            if (artist && trackTitle) {
                const trackData = `${artist} - ${trackTitle}\n`;
                this.tracklistData += trackData;
            }
        });

        if ('' !== this.tracklistData) {
            this.copyToClipboard();
        } else {
            alert('No tracklist data found on the page!');
        }
    }

    extractTextContent(element, selector) {
        const targetElement = element.querySelector(selector);
        return targetElement ? targetElement.textContent.trim() : '';
    }

    copyToClipboard() {
        const textarea = document.createElement('textarea');
        textarea.value = this.tracklistData;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        alert('Tracklist data copied to clipboard!');
    }

    addButton() {
        if (this.tracklistTable) {
            const button = document.createElement('button');
            button.textContent = 'Copy Tracklist Data';
            button.style.margin = '10px';
            button.addEventListener('click', () => this.copyTracklistData());

            this.tracklistTable.parentNode.insertBefore(button, this.tracklistTable);
        }
    }
}

(function() {
    'use strict';

    const tracklistDataCopier = new TracklistDataCopier();
    window.addEventListener('load', () => tracklistDataCopier.addButton());
})();
