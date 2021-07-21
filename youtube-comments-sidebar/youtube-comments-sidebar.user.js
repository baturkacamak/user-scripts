// ==UserScript==
// @id           youtube-comments-sidebar@https://github.com/baturkacamak/userscripts
// @name         Youtube Comments Sidebar
// @namespace    https://github.com/baturkacamak/userscripts
// @version      0.1
// @description  This script will move youtube comments to sidebar before related videos.
// @author       Batur Kacamak
// @copyright    2021+, Batur Kacamak (https://batur.info/)
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/youtube-comments-sidebar#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/youtube-comments-sidebar#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/youtube-comments-sidebar/youtube-comments-sidebar.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/youtube-comments-sidebar/youtube-comments-sidebar.user.js
// @match        https://youtube.com/*
// @match        https://www.youtube.com/*
// @icon         https://youtube.com/favicon.ico
// @run-at       document-idle
// @grant        unsafeWindow
// ==/UserScript==

class YoutubeCommentsSidebar {
	static waitFor = (...selectors) => new Promise((resolve) => {
		const delay = 500;
		const f = () => {
			const elements = selectors.map((selector) => document.querySelector(selector));
			if (elements.every((element) => element != null)) {
				resolve(elements);
			} else {
				setTimeout(f, delay);
			}
		};
		f();
	});

	constructor() {
		YoutubeCommentsSidebar.waitFor(['#comments']).then(this.init);
	}

	init() {
		if (document.querySelector('#secondary-inner')) {
			document.querySelector('#secondary-inner').insertAdjacentElement('afterbegin', document.querySelector('#comments'));
			// set height as player
			document.querySelector('#comments').style.height = `${document.querySelector('#player.ytd-watch-flexy').offsetHeight}px`;
			document.querySelector('#comments').style.overflow = 'auto';


		}
	}
}

// eslint-disable-next-line no-unused-vars
const youtubeCommentsSidebar = new YoutubeCommentsSidebar();
