// ==UserScript==
// @id           userscripts-dev-loader@local
// @name         Universal Development Script Loader
// @namespace    local
// @version      0.1
// @description  Automatically loads the appropriate local development script based on the current site
// @author       Batur Kacamak
// @match        https://*.wallapop.com/*
// @match        https://*.loom.com/*
// @icon         https://github.com/baturkacamak.png
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  // Configuration for scripts
  const scriptConfigs = [
    {
      name: 'Wallapop Enhanced Tools',
      matches: ['wallapop.com'],
      path: 'wallapop-enhanced-tools/wallapop-enhanced-tools.user.js',
    },
    {
      name: 'Loom Captions Extractor',
      matches: ['loom.com'],
      path: 'loom-captions-extractor/loom-captions-extractor.user.js',
    },
    // Add more script configurations here as needed
  ];

  // Development server configuration
  const devServer = {
    protocol: 'http',
    host: 'localhost',
    port: 3000,
  };

  // Find the appropriate script based on current URL
  function findMatchingScript() {
    const currentHost = window.location.hostname;

    for (const config of scriptConfigs) {
      if (config.matches.some((match) => currentHost.includes(match))) {
        return config;
      }
    }

    return null;
  }

  // Get the full script URL with cache busting
  function getScriptUrl(scriptPath) {
    const bustCache = Math.random().toString(36).substring(2);
    return `${devServer.protocol}://${devServer.host}:${devServer.port}/${scriptPath}?cache_bust=${bustCache}`;
  }

  // Inject script via script tag
  function tryScriptTagInjection(scriptUrl, scriptName) {
    console.log(`[Dev Loader] Attempting to load ${scriptName} from ${scriptUrl}`);

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.onload = () => {
      console.log(`[Dev Loader] ${scriptName} loaded successfully via <script src>`);
    };
    script.onerror = () => {
      console.error(`[Dev Loader] Failed to load ${scriptName} via <script src>, trying fallback`);
      fallbackInlineInjection(scriptUrl, scriptName);
    };
    document.head.appendChild(script);
  }

  // Fallback to GM_xmlhttpRequest for CORS issues
  function fallbackInlineInjection(scriptUrl, scriptName) {
    console.warn(`[Dev Loader] Falling back to inline script injection for ${scriptName} (CORS fallback)`);

    GM_xmlhttpRequest({
      method: 'GET',
      url: scriptUrl,
      onload: function(response) {
        if (200 === response.status) {
          const inlineScript = document.createElement('script');
          inlineScript.textContent = response.responseText;
          document.head.appendChild(inlineScript);
          console.log(`[Dev Loader] ${scriptName} injected successfully via inline script`);
        } else {
          console.error(`[Dev Loader] Failed to fetch ${scriptName} via GM_xmlhttpRequest:`, response.status);
        }
      },
      onerror: function(error) {
        console.error(`[Dev Loader] Error in fallback GM_xmlhttpRequest for ${scriptName}:`, error);
      },
    });
  }

  // Main function
  function init() {
    // Find matching script for current site
    const matchingScript = findMatchingScript();

    if (matchingScript) {
      const scriptUrl = getScriptUrl(matchingScript.path);
      tryScriptTagInjection(scriptUrl, matchingScript.name);
    } else {
      console.log('[Dev Loader] No matching script configuration found for this site');
    }
  }

  // Start the loader
  init();
})();
