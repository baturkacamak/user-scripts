// ==UserScript==
// @id           userscripts-dev-loader@local
// @name         Universal Development Script Loader
// @namespace    local
// @version      0.4
// @description  Loads local development scripts with module support and Vite HMR
// @author       Batur Kacamak
// @match        https://*.wallapop.com/*
// @match        https://*.loom.com/*
// @match        https://*.instagram.com/*
// @match        https://*.whatsapp.com/*
// @match        https://lingualeo.com/tr/training/leoSprint
// @icon         https://github.com/baturkacamak.png
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_info
// @grant        URL.createObjectURL
// @grant        unsafeWindow
// @connect      localhost
// @connect      127.0.0.1
// @connect      *
// ==/UserScript==

(function() {
  'use strict';

  const logger = {
    log: (msg, color = '#2196F3') => console.log(`%c[Dev Loader][${new Date().toISOString()}] ${msg}`, `color: ${color}`),
    warn: (msg) => console.warn(`%c[Dev Loader][${new Date().toISOString()}] ${msg}`, 'color: #FF9800'),
    error: (msg) => console.error(`%c[Dev Loader][${new Date().toISOString()}] ${msg}`, 'color: #F44336'),
    debug: (msg) => console.log(`%c[Dev Loader][${new Date().toISOString()}] ${msg}`, 'color: #4CAF50'),
  };

  logger.log('Script loader initialized with module support', '#9C27B0');

  const scriptConfigs = [
    {
      name: 'Wallapop Enhanced Tools',
      matches: ['wallapop.com'],
      path: 'userscripts/wallapop-enhanced-tools/wallapop-enhanced-tools.user.js',
      isModule: false,
      fallbacks: ['blob', 'iframe', 'worker', 'moduleFallback'],
    },
    {
      name: 'Loom Captions Extractor',
      matches: ['loom.com'],
      path: 'userscripts/loom-captions-extractor/loom-captions-extractor.user.js',
      isModule: true, // Vite module
      fallbacks: ['moduleBlob', 'moduleProxy', 'moduleIframe', 'moduleEval'],
    },
    {
      name: 'Instagram Video Controls',
      matches: ['instagram.com'],
      path: 'userscripts/instagram-video-controls/instagram-video-controls.user.js',
      isModule: true, // Vite module
      fallbacks: ['moduleBlob', 'moduleProxy', 'moduleIframe', 'vanilla'],
    },
    {
      name: 'Whatsapp Send New',
      matches: ['whatsapp.com'],
      path: 'userscripts/whatsapp-send-new/whatsapp-send-new.user.js',
      isModule: false, // Standard userscript
      fallbacks: ['blob', 'iframe', 'worker'], // Standard fallbacks for non-modules
    },
    {
      name: 'Tidal URI Scheme Converter',
      matches: ['whatsapp.com'], // Matches the current setting in meta.json
      path: 'userscripts/tidal-uri-scheme-converter/tidal-uri-scheme-converter.user.js',
      isModule: false, // Standard userscript
      fallbacks: ['blob', 'iframe', 'worker'],
    },
    {
      name: 'Lingualeo Speaker',
      matches: ['lingualeo.com/tr/training/leoSprint'],
      path: 'userscripts/lingualeo-speak/lingualeo-speak.user.js',
      isModule: false, // Standard userscript
      fallbacks: ['blob', 'iframe', 'worker'],
    },
    {
      name: 'Instagram Story Anonymity Guard',
      matches: ['instagram.com'],
      path: 'userscripts/instagram-story-anonymity-guard/instagram-story-anonymity-guard.user.js',
      isModule: false, // Standard userscript, XHR override needs to happen early
      fallbacks: ['blob', 'iframe', 'worker'], // Basic fallbacks
    },
    {
      name: 'Google Maps Image Downloader',
      matches: ['google.com/maps', 'google.co.uk/maps', 'google.es/maps', 'google.de/maps', 'google.fr/maps', 'google.it/maps', 'google.nl/maps', 'google.pl/maps', 'google.pt/maps', 'google.com.tr/maps'], // Add more TLDs as needed
      path: 'userscripts/googlemaps-image-downloader/googlemaps-image-downloader.user.js',
      isModule: false, // Will become true if we use the .js file directly and it has imports
      fallbacks: ['blob', 'iframe', 'worker'],
    },
    {
      name: 'Discogs Tracklist Copier',
      matches: ['discogs.com/release', 'discogs.com/master'], // Matches release and master pages
      path: 'userscripts/discogs-tracklist-copier/discogs-tracklist-copier.user.js',
      isModule: false, // Standard userscript for now
      fallbacks: ['blob', 'iframe', 'worker'],
    },
  ];

  const devServers = [
    {
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      priority: 1,
      isVite: true,
    },
    {
      protocol: 'http',
      host: '127.0.0.1',
      port: 3000,
      priority: 2,
      isVite: true,
    },
    {
      protocol: 'http',
      host: window.location.hostname.replace('www.', 'dev.'),
      port: 3000,
      priority: 3,
      isVite: false,
    },
  ].sort((a, b) => a.priority - b.priority);

  // Cache system to avoid repeated failed attempts
  const cache = {
    get: (key) => GM_getValue(key, null),
    set: (key, value) => GM_setValue(key, value),
    clear: (key) => GM_deleteValue(key),
  };

  // Find the appropriate script based on current URL
  function findMatchingScript() {
    const currentHost = window.location.hostname;
    logger.debug(`Checking host: ${currentHost} against ${scriptConfigs.length} script configs`);

    const matchedScript = scriptConfigs.find((config) =>
      config.matches.some((match) => currentHost.includes(match)),
    );

    if (matchedScript) {
      logger.log(`Found matching script: ${matchedScript.name}`, '#4CAF50');
    } else {
      logger.warn('No matching script configuration found for this site');
    }

    return matchedScript || null;
  }

  // ======================
  // MODULE-SPECIFIC FALLBACKS
  // ======================

  // Method 1: Module Blob injection
  async function injectModuleViaBlob(content, scriptName) {
    try {
      logger.debug(`Creating module Blob for ${scriptName}`);
      const blob = new Blob([content], {type: 'application/javascript'});
      const url = URL.createObjectURL(blob);

      const script = document.createElement('script');
      script.type = 'module';
      script.src = url;
      script.onload = () => {
        logger.log(`Successfully injected ${scriptName} as module via Blob URL`);
        URL.revokeObjectURL(url);
      };
      script.onerror = (err) => {
        logger.warn(`Module Blob injection failed for ${scriptName}`);
        URL.revokeObjectURL(url);
        throw err;
      };
      document.head.appendChild(script);
      return true;
    } catch (e) {
      logger.error(`Module Blob creation failed: ${e.message}`);
      return false;
    }
  }

  // Method 2: Module Proxy injection
  async function injectModuleViaProxy(moduleUrl, scriptName) {
    try {
      logger.debug(`Attempting module proxy for ${scriptName}`);

      // Create a proxy script that imports the module
      const proxyCode = `
        import('${moduleUrl}')
          .then(() => console.log('Module ${scriptName} loaded via proxy'))
          .catch(err => console.error('Module load failed', err));
      `;

      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = proxyCode;
      document.head.appendChild(script);

      logger.log(`Module proxy created for ${scriptName}`);
      return true;
    } catch (e) {
      logger.error(`Module proxy failed: ${e.message}`);
      return false;
    }
  }

  // Method 3: Module Iframe sandbox
  async function injectModuleViaIframe(moduleUrl, scriptName) {
    return new Promise((resolve) => {
      logger.debug(`Creating module iframe for ${scriptName}`);

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.srcdoc = `
        <!DOCTYPE html>
        <html>
          <head>
            <script type="module">
              try {
                import('${moduleUrl}');
                window.parent.postMessage({ type: 'moduleLoad', success: true }, '*');
              } catch (e) {
                window.parent.postMessage({ type: 'moduleLoad', success: false, error: e.message }, '*');
              }
            </script>
          </head>
        </html>
      `;

      const handler = (event) => {
        if ('moduleLoad' === event.data.type) {
          window.removeEventListener('message', handler);
          if (event.data.success) {
            logger.log(`Module ${scriptName} loaded in iframe`);
            resolve(true);
          } else {
            logger.warn(`Module iframe failed: ${event.data.error}`);
            resolve(false);
          }
          document.body.removeChild(iframe);
        }
      };

      window.addEventListener('message', handler);
      document.body.appendChild(iframe);
    });
  }

  // Method 4: GM_addElement workarounds
  async function injectViaGMElement(scriptConfig, url) {
    try {
      // Attempt 1: Try with type module
      try {
        GM_addElement('script', {
          type: 'module',
          src: url,
        });
        logger.log(`Successfully loaded ${scriptConfig.name} via GM_addElement with module`);
        return true;
      } catch (e) {
        logger.debug('GM_addElement with module failed, trying without module type');
      }

      // Attempt 2: Try without module type
      try {
        GM_addElement('script', {
          src: url,
        });
        logger.log(`Loaded ${scriptConfig.name} via GM_addElement (non-module)`);
        return !scriptConfig.isModule; // Only success if not expecting module
      } catch (e) {
        logger.debug('GM_addElement without module type failed');
      }

      // Attempt 3: Try with inline module code
      if (scriptConfig.isModule) {
        try {
          const content = await fetchScriptContent(url);
          GM_addElement('script', {
            type: 'module',
            textContent: content,
          });
          logger.log(`Loaded ${scriptConfig.name} via GM_addElement with inline module`);
          return true;
        } catch (e) {
          logger.debug('GM_addElement with inline module failed');
        }
      }

      return false;
    } catch (e) {
      logger.error(`GM_addElement injection failed: ${e.message}`);
      return false;
    }
  }

  // Method 5: Vite-specific HMR adapter
  async function injectViteModule(scriptConfig) {
    try {
      const viteServer = devServers.find((s) => s.isVite);
      if (!viteServer) return false;

      const baseUrl = `${viteServer.protocol}://${viteServer.host}:${viteServer.port}`;
      const viteClientUrl = `${baseUrl}/@vite/client`;
      const scriptUrl = `${baseUrl}/${scriptConfig.path}`;

      // First inject Vite client
      await injectModuleViaProxy(viteClientUrl, 'Vite Client');

      // Then inject our module
      const success = await injectModuleViaProxy(scriptUrl, scriptConfig.name);

      if (success) {
        logger.log(`Vite module ${scriptConfig.name} loaded with HMR support`);
        return true;
      }
      return false;
    } catch (e) {
      logger.error(`Vite injection failed: ${e.message}`);
      return false;
    }
  }

  // ======================
  // CLASSIC INJECTION METHODS (from v0.3)
  // ======================

  // Method 1: Direct script tag injection
  function injectViaScriptTag(url, scriptName) {
    return new Promise((resolve, reject) => {
      logger.debug(`Attempting direct script tag injection for ${scriptName}`);

      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        logger.log(`Successfully loaded ${scriptName} via direct script tag`);
        resolve(true);
      };
      script.onerror = (err) => {
        logger.warn(`Direct script tag failed for ${scriptName}`);
        reject(err);
      };
      document.head.appendChild(script);
    });
  }

  // Method 2: Blob URL injection
  function injectViaBlob(content, scriptName) {
    return new Promise((resolve, reject) => {
      try {
        logger.debug(`Creating Blob for ${scriptName}`);
        const blob = new Blob([content], {type: 'application/javascript'});
        const url = URL.createObjectURL(blob);

        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
          logger.log(`Successfully injected ${scriptName} via Blob URL`);
          URL.revokeObjectURL(url);
          resolve(true);
        };
        script.onerror = (err) => {
          logger.warn(`Blob injection failed for ${scriptName}`);
          URL.revokeObjectURL(url);
          reject(err);
        };
        document.head.appendChild(script);
      } catch (e) {
        logger.error(`Blob creation failed: ${e.message}`);
        reject(e);
      }
    });
  }

  // Method 3: Iframe injection
  function injectViaIframe(content, scriptName) {
    return new Promise((resolve, reject) => {
      logger.debug(`Attempting iframe injection for ${scriptName}`);

      try {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.srcdoc = `
          <html>
            <head>
              <script>
                try {
                  ${content}
                  window.parent.postMessage({ type: 'scriptLoad', success: true }, '*');
                } catch (e) {
                  window.parent.postMessage({ type: 'scriptLoad', success: false, error: e.message }, '*');
                }
              </script>
            </head>
          </html>
        `;

        const handler = (event) => {
          if ('scriptLoad' === event.data.type) {
            window.removeEventListener('message', handler);
            if (event.data.success) {
              logger.log(`Successfully injected ${scriptName} via iframe`);
              resolve(true);
            } else {
              logger.warn(`Iframe injection failed: ${event.data.error}`);
              reject(new Error(event.data.error));
            }
            document.body.removeChild(iframe);
          }
        };

        window.addEventListener('message', handler);
        document.body.appendChild(iframe);
      } catch (e) {
        logger.error(`Iframe creation failed: ${e.message}`);
        reject(e);
      }
    });
  }

  // Method 4: Web Worker injection
  function injectViaWorker(content, scriptName) {
    return new Promise((resolve, reject) => {
      logger.debug(`Attempting Web Worker injection for ${scriptName}`);

      try {
        const blob = new Blob([content], {type: 'application/javascript'});
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);

        worker.onmessage = (e) => {
          if ('scriptLoaded' === e.data) {
            logger.log(`Successfully injected ${scriptName} via Web Worker`);
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
            resolve(true);
          }
        };

        worker.onerror = (e) => {
          logger.warn(`Worker injection failed: ${e.message}`);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          reject(e);
        };

        worker.postMessage('executeScript');
      } catch (e) {
        logger.error(`Worker creation failed: ${e.message}`);
        reject(e);
      }
    });
  }

  // Method 5: Eval fallback (last resort)
  function injectViaEval(content, scriptName) {
    return new Promise((resolve, reject) => {
      logger.warn(`Attempting eval injection for ${scriptName} (unsafe fallback)`);

      try {
        unsafeWindow.eval(content);
        logger.log(`Successfully injected ${scriptName} via eval`);
        resolve(true);
      } catch (e) {
        logger.error(`Eval injection failed: ${e.message}`);
        reject(e);
      }
    });
  }

  // Method 6: Extension messaging fallback
  function injectViaExtension(scriptUrl, scriptName) {
    return new Promise((resolve) => {
      logger.debug(`Attempting extension messaging for ${scriptName}`);

      // This would require a companion extension
      if ('undefined' !== typeof chrome && chrome.runtime) {
        chrome.runtime.sendMessage(GM_info.script.uuid, {
          type: 'loadScript',
          url: scriptUrl,
        }, (response) => {
          if (response?.success) {
            logger.log(`Successfully loaded ${scriptName} via extension`);
            resolve(true);
          } else {
            logger.warn('Extension messaging failed or no response');
            resolve(false);
          }
        });
      } else {
        logger.warn('Extension API not available');
        resolve(false);
      }
    });
  }

  // ======================
  // UTILITY FUNCTIONS
  // ======================

  async function fetchScriptContent(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: (response) => {
          if (200 === response.status) {
            resolve(response.responseText);
          } else {
            reject(new Error(`HTTP ${response.status}`));
          }
        },
        onerror: reject,
        timeout: 5000,
      });
    });
  }

  function getScriptUrls(scriptPath) {
    const timestamp = Date.now();
    return devServers.map((server) => ({
      url: `${server.protocol}://${server.host}:${server.port}/${scriptPath}?t=${timestamp}`,
      priority: server.priority,
      isVite: server.isVite,
    })).sort((a, b) => a.priority - b.priority);
  }

  // ======================
  // MAIN LOADING LOGIC
  // ======================

  async function loadScriptWithFallbacks(scriptConfig) {
    const scriptName = scriptConfig.name;
    const scriptUrls = getScriptUrls(scriptConfig.path);

    logger.log(`Starting load process for ${scriptName} (${scriptConfig.isModule ? 'module' : 'classic'})`);

    // Special handling for Vite modules
    if (scriptConfig.isModule) {
      logger.debug('Checking for Vite server');
      const viteSuccess = await injectViteModule(scriptConfig);
      if (viteSuccess) return true;
    }

    // Try each server URL in order
    for (const {url, isVite} of scriptUrls) {
      logger.debug(`Attempting to load from: ${url} (Vite: ${isVite})`);

      try {
        // Try GM_addElement first if available
        if ('undefined' !== typeof GM_addElement) {
          const gmSuccess = await injectViaGMElement(scriptConfig, url);
          if (gmSuccess) return true;
        }

        // Try direct script tag injection first
        try {
          await injectViaScriptTag(url, scriptName);
          return true;
        } catch (e) {
          logger.debug(`Direct script tag failed, trying fallbacks: ${e.message}`);
        }

        // Fetch script content for other methods
        const content = await fetchScriptContent(url);

        // Try module-specific methods if needed
        if (scriptConfig.isModule) {
          // Method 1: Module Blob
          if (scriptConfig.fallbacks.includes('moduleBlob')) {
            const success = await injectModuleViaBlob(content, scriptName);
            if (success) return true;
          }

          // Method 2: Module Proxy
          if (scriptConfig.fallbacks.includes('moduleProxy')) {
            const success = await injectModuleViaProxy(url, scriptName);
            if (success) return true;
          }

          // Method 3: Module Iframe
          if (scriptConfig.fallbacks.includes('moduleIframe')) {
            const success = await injectModuleViaIframe(url, scriptName);
            if (success) return true;
          }

          // Method 4: Eval with module wrapper
          if (scriptConfig.fallbacks.includes('moduleEval')) {
            try {
              const moduleWrapper = `(async () => { ${content} })();`;
              const success = await injectViaEval(moduleWrapper, scriptName);
              if (success) return true;
            } catch (e) {
              logger.warn(`Module eval failed: ${e.message}`);
            }
          }
        } else {
          // Classic injection methods for non-module scripts

          // Method 1: Blob injection
          if (scriptConfig.fallbacks.includes('blob')) {
            try {
              await injectViaBlob(content, scriptName);
              return true;
            } catch (e) {
              logger.debug(`Blob injection failed: ${e.message}`);
            }
          }

          // Method 2: Iframe injection
          if (scriptConfig.fallbacks.includes('iframe')) {
            try {
              await injectViaIframe(content, scriptName);
              return true;
            } catch (e) {
              logger.debug(`Iframe injection failed: ${e.message}`);
            }
          }

          // Method 3: Worker injection
          if (scriptConfig.fallbacks.includes('worker')) {
            try {
              await injectViaWorker(content, scriptName);
              return true;
            } catch (e) {
              logger.debug(`Worker injection failed: ${e.message}`);
            }
          }

          // Method 4: Extension messaging
          if (scriptConfig.fallbacks.includes('extension')) {
            try {
              const success = await injectViaExtension(url, scriptName);
              if (success) return true;
            } catch (e) {
              logger.debug(`Extension messaging failed: ${e.message}`);
            }
          }

          // Method 5: Eval (last resort)
          if (scriptConfig.fallbacks.includes('eval')) {
            try {
              await injectViaEval(content, scriptName);
              return true;
            } catch (e) {
              logger.debug(`Eval injection failed: ${e.message}`);
            }
          }
        }
      } catch (e) {
        logger.warn(`Failed to load from ${url}: ${e.message}`);
      }
    }

    logger.error(`All loading methods failed for ${scriptName}`);
    return false;
  }

  // Initialization
  async function init() {
    const matchingScript = findMatchingScript();
    if (!matchingScript) return;

    const cacheKey = `loaded_${matchingScript.name}`;
    logger.log(`Loading script: ${matchingScript.name}`);
    const success = await loadScriptWithFallbacks(matchingScript);

    if (success) {
      cache.set(cacheKey, true);
      logger.log(`Successfully loaded ${matchingScript.name}`, '#8BC34A');
    } else {
      logger.error(`Failed to load ${matchingScript.name} after all attempts`);
    }
  }

  // Start with delay to allow page to settle
  setTimeout(() => {
    try {
      init();
    } catch (e) {
      logger.error(`Fatal loader error: ${e.message}`);
    }
  }, 1000);
})();
