// ==UserScript==
// @id           wallapop-expand-description@https://github.com/baturkacamak/userscripts
// @name         Wallapop Expand Description
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.4.2
// @description  Add expand button to show formatted item descriptions on Wallapop listings with copy functionality
// @author       Batur Kacamak
// @copyright    2024+, Batur Kacamak (https://batur.info/)
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/wallapop-expand-description#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/wallapop-expand-description#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/wallapop-expand-description/wallapop-expand-description.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/wallapop-expand-description/wallapop-expand-description.user.js
// @match        https://*.wallapop.com/*
// @icon         https://es.wallapop.com/favicon.ico
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// ==/UserScript==

// GM function fallbacks for direct browser execution
if (typeof GM_addStyle === 'undefined') {
    window.GM_addStyle = function (css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        return style;
    };
}

if (typeof GM_xmlhttpRequest === 'undefined') {
    window.GM_xmlhttpRequest = function (details) {
        const xhr = new XMLHttpRequest();
        xhr.open(details.method, details.url);

        if (details.headers) {
            Object.keys(details.headers).forEach(key => {
                xhr.setRequestHeader(key, details.headers[key]);
            });
        }

        xhr.onload = function () {
            if (details.onload) {
                details.onload({
                    responseText: xhr.responseText,
                    response: xhr.response,
                    status: xhr.status,
                    statusText: xhr.statusText,
                    readyState: xhr.readyState
                });
            }
        };

        xhr.onerror = function () {
            if (details.onerror) {
                details.onerror(xhr);
            }
        };

        xhr.send(details.data);
        return xhr;
    };
}

if (typeof GM_setClipboard === 'undefined') {
    window.GM_setClipboard = function (text) {
        // Create a temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = text;

        // Make the textarea not visible
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';

        document.body.appendChild(textarea);
        textarea.select();

        // Try to copy the text
        let success = false;
        try {
            success = document.execCommand('copy');
            console.log('Clipboard copy ' + (success ? 'successful' : 'unsuccessful'));
        } catch (err) {
            console.error('Error copying to clipboard:', err);
        }

        // Clean up
        document.body.removeChild(textarea);
        return success;
    };
}

const SELECTORS = {
    ITEM_CARDS: [
        'a.ItemCardList__item[href^="https://es.wallapop.com/item/"]',
        '[class^="experimentator-layout-slider_ExperimentatorSliderLayout__item"] a[href^="/item/"]',
        '[class^="feed_Feed__item__"] a[href^="/item/"]',
    ],
    ITEM_DESCRIPTION: '[class^="item-detail_ItemDetail__description__"]',
    EXPAND_BUTTON: '.expand-button',
    // New consolidated control panel selectors
    CONTROL_PANEL: '.control-panel',
    FILTER_INPUT: '.filter-input',
    FILTER_APPLY: '.filter-apply',
    BLOCKED_TERMS_LIST: '.blocked-terms-list'
};

class Logger {
    static DEBUG = true;

    static log(...args) {
        if (this.DEBUG) {
            console.log("Wallapop Expand Description Debug:", ...args);
        }
    }

    static error(error, context) {
        console.error(`Wallapop Expand Description Error (${context}):`, error);
    }

    static logHtml(title, htmlContent) {
        if (this.DEBUG) {
            console.log(`Wallapop Expand Description [${title}]:`);
            console.log(htmlContent.substring(0, 1500) + "...");

            // HTML'i daha rahat inceleyebilmek için konsol içinde genişletilebilir obje olarak da gösterelim
            console.groupCollapsed(`HTML Detayları (${title})`);
            console.log("Tam HTML:", htmlContent);
            console.groupEnd();
        }
    }

    static toggleDebug() {
        this.DEBUG = !this.DEBUG;
        console.log(`Wallapop Expand Description: Debug mode ${this.DEBUG ? 'enabled' : 'disabled'}`);
        return this.DEBUG;
    }
}

class StyleManager {
    static addStyles() {
        const style = document.createElement('style');
        style.textContent = `
        :root {
            --transition-speed: 0.3s;
            --transition-easing: ease-in-out;
            --panel-background: #ffffff;
            --panel-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            --panel-border-radius: 8px;
            --panel-accent-color: #008080;
            --panel-hover-color: #006666;
        }

        /* Control Panel Styles */
        .control-panel {
            position: fixed;
            top: 120px;
            right: 20px;
            background-color: var(--panel-background);
            border-radius: var(--panel-border-radius);
            box-shadow: var(--panel-shadow);
            padding: 0;
            z-index: 9999;
            width: 280px;
            display: flex;
            flex-direction: column;
            transition: opacity var(--transition-speed) var(--transition-easing),
                        transform var(--transition-speed) var(--transition-easing);
        }

        .panel-title, .section-title {
            font-weight: bold;
            font-size: 14px;
            padding: 10px 15px;
            color: #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            user-select: none;
        }

        .panel-title {
            background-color: var(--panel-accent-color);
            color: white;
            border-radius: var(--panel-border-radius) var(--panel-border-radius) 0 0;
        }

        .panel-toggle, .section-toggle {
            cursor: pointer;
            user-select: none;
            transition: transform 0.3s var(--transition-easing);
        }

        .panel-content {
            display: flex;
            flex-direction: column;
            max-height: 800px;
            overflow: hidden;
            opacity: 1;
            transition: max-height var(--transition-speed) var(--transition-easing),
                        opacity var(--transition-speed) var(--transition-easing);
        }

        .panel-content.collapsed {
            max-height: 0;
            opacity: 0;
        }

        .panel-section {
            border-bottom: 1px solid #eee;
        }

        .panel-section:last-child {
            border-bottom: none;
        }

        .section-content {
            padding: 15px;
            max-height: 300px;
            overflow: hidden;
            opacity: 1;
            transition: max-height var(--transition-speed) var(--transition-easing),
                        opacity var(--transition-speed) var(--transition-easing),
                        padding var(--transition-speed) var(--transition-easing);
        }

        .section-content.collapsed {
            max-height: 0;
            opacity: 0;
            padding-top: 0;
            padding-bottom: 0;
        }

        .filter-input {
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            width: 100%;
            box-sizing: border-box;
            transition: border-color var(--transition-speed) var(--transition-easing);
        }

        .filter-input:focus {
            border-color: var(--panel-accent-color);
            outline: none;
        }

        .panel-button {
            display: block;
            background-color: var(--panel-accent-color);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            margin-top: 10px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
            text-align: center;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .panel-button:hover,
        .copy-button:hover {
            background-color: var(--panel-hover-color);
        }

        .copy-button {
            display: block;
            background-color: var(--panel-accent-color);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
            text-align: left;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .copy-success {
            background-color: #4CAF50;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .blocked-terms-list {
            max-height: 150px;
            overflow-y: auto;
            margin-top: 10px;
        }

        .blocked-term-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            background-color: #f0f0f0;
            border-radius: 4px;
            margin-bottom: 5px;
            animation: fadeIn 0.3s ease-in-out;
        }

        .remove-term {
            background: none;
            border: none;
            color: #ff6b6b;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            transition: transform var(--transition-speed) var(--transition-easing),
                        color var(--transition-speed) var(--transition-easing);
        }

        .remove-term:hover {
            transform: scale(1.2);
            color: #ff4040;
        }

        .copy-dropdown {
            position: relative;
            display: inline-block;
            width: 100%;
            margin-top: 10px;
        }

        .dropdown-content {
            display: block;
            position: absolute;
            background-color: #f1f1f1;
            min-width: 160px;
            box-shadow: 0px 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
            right: 0;
            margin-top: 2px;
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            pointer-events: none;
            transition: max-height var(--transition-speed) var(--transition-easing),
                        opacity var(--transition-speed) var(--transition-easing);
        }

        .dropdown-content.top {
            bottom: 100%;
            margin-top: 0;
            margin-bottom: 2px;
        }

        .copy-dropdown:hover .dropdown-content {
            max-height: 200px;
            opacity: 1;
            pointer-events: auto;
        }

        .dropdown-content button {
            color: black;
            padding: 12px 16px;
            background: none;
            border: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .dropdown-content button:hover {
            background-color: #ddd;
        }

        .language-selector {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }

        .lang-button {
            flex-grow: 1;
            flex-basis: 45%;
            background-color: #f0f0f0;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            text-align: center;
            transition: background-color var(--transition-speed) var(--transition-easing),
                        border-color var(--transition-speed) var(--transition-easing);
        }

        .lang-button:hover {
            background-color: #e0e0e0;
        }

        .lang-button.active {
            background-color: var(--panel-accent-color);
            color: white;
            border-color: var(--panel-accent-color);
        }

        ${SELECTORS.EXPAND_BUTTON} {
            background: none;
            border: none;
            color: #008080;
            cursor: pointer;
            padding: 5px;
            font-size: 12px;
            text-decoration: underline;
            transition: opacity var(--transition-speed) var(--transition-easing);
        }

        .description-content {
            max-height: 0;
            overflow: hidden;
            padding: 0 10px;
            background-color: #f0f0f0;
            border-radius: 5px;
            margin-top: 5px;
            font-size: 14px;
            white-space: pre-wrap;
            word-wrap: break-word;
            transition: max-height var(--transition-speed) var(--transition-easing),
                        padding var(--transition-speed) var(--transition-easing);
        }

        .description-content.expanded {
            max-height: 1000px;
            padding: 10px;
            transition: max-height 0.5s var(--transition-easing),
                        padding var(--transition-speed) var(--transition-easing);
        }

        .error-message {
            color: #ff0000;
            font-style: italic;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeOut {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(-10px);
            }
        }

        .fadeOutAnimation {
            animation: fadeOut 0.3s ease-in-out forwards;
        }

        .hidden-item {
            display: none !important;
        }

        .hiding-animation {
            animation: fadeOut 0.5s ease-in-out forwards;
        }
    `;
        document.head.appendChild(style);
    }
}

class HTMLUtils {
    static escapeHTML(str) {
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        };
        return str.replace(/[&<>'"]/g, tag => escapeMap[tag] || tag);
    }
}

class TranslationManager {
    static availableLanguages = {
        en: 'English',
        es: 'Español',
        ca: 'Català',
        tr: 'Türkçe', // The script already has some Turkish text
        pt: 'Português',
        it: 'Italiano',
        fr: 'Français',
        de: 'Deutsch',
        nl: 'Nederlands'
    };

    static currentLanguage = 'en'; // Default language

    static translations = {
        en: {
            expandDescription: 'Expand Description',
            hideDescription: 'Hide Description',
            loading: 'Loading...',
            wallapopTools: 'Wallapop Tools',
            filterUnwantedWords: 'Filter Unwanted Words',
            example: 'E.g: mac, apple, macbook...',
            addAndApply: 'Add and Apply',
            noWordsToFilter: 'No words to filter',
            remove: 'Remove',
            copyDescriptions: 'Copy Descriptions',
            copyAsJSON: 'Copy as JSON',
            copyAsCSV: 'Copy as CSV',
            withHeaders: 'With Headers',
            withoutHeaders: 'Without Headers',
            clearAll: 'Clear All',
            cleared: 'Cleared!',
            copied: 'Copied!',
            nothingToCopy: 'Nothing to copy!',
            languageSettings: 'Language Settings',
            errorOccurred: 'An unexpected error occurred',
            failedToParse: 'Failed to parse description:'
        },
        es: {
            expandDescription: 'Ampliar Descripción',
            hideDescription: 'Ocultar Descripción',
            loading: 'Cargando...',
            wallapopTools: 'Herramientas Wallapop',
            filterUnwantedWords: 'Filtrar Palabras No Deseadas',
            example: 'Ej: mac, apple, macbook...',
            addAndApply: 'Añadir y Aplicar',
            noWordsToFilter: 'No hay palabras para filtrar',
            remove: 'Eliminar',
            copyDescriptions: 'Copiar Descripciones',
            copyAsJSON: 'Copiar como JSON',
            copyAsCSV: 'Copiar como CSV',
            withHeaders: 'Con Encabezados',
            withoutHeaders: 'Sin Encabezados',
            clearAll: 'Borrar Todo',
            cleared: '¡Borrado!',
            copied: '¡Copiado!',
            nothingToCopy: '¡Nada para copiar!',
            languageSettings: 'Configuración de Idioma',
            errorOccurred: 'Ocurrió un error inesperado',
            failedToParse: 'Error al analizar la descripción:'
        },
        ca: {
            expandDescription: 'Ampliar Descripció',
            hideDescription: 'Amagar Descripció',
            loading: 'Carregant...',
            wallapopTools: 'Eines de Wallapop',
            filterUnwantedWords: 'Filtrar Paraules No Desitjades',
            example: 'Ex: mac, apple, macbook...',
            addAndApply: 'Afegir i Aplicar',
            noWordsToFilter: 'No hi ha paraules per filtrar',
            remove: 'Eliminar',
            copyDescriptions: 'Copiar Descripcions',
            copyAsJSON: 'Copiar com a JSON',
            copyAsCSV: 'Copiar com a CSV',
            withHeaders: 'Amb Capçaleres',
            withoutHeaders: 'Sense Capçaleres',
            clearAll: 'Esborrar Tot',
            cleared: 'Esborrat!',
            copied: 'Copiat!',
            nothingToCopy: 'Res per copiar!',
            languageSettings: 'Configuració d\'Idioma',
            errorOccurred: 'S\'ha produït un error inesperat',
            failedToParse: 'Error en analitzar la descripció:'
        },
        tr: {
            expandDescription: 'Açıklamayı Genişlet',
            hideDescription: 'Açıklamayı Gizle',
            loading: 'Yükleniyor...',
            wallapopTools: 'Wallapop Araçları',
            filterUnwantedWords: 'İstenmeyen Kelimeleri Filtrele',
            example: 'Örn: mac, apple, macbook...',
            addAndApply: 'Ekle ve Uygula',
            noWordsToFilter: 'Filtrelenecek kelime yok',
            remove: 'Kaldır',
            copyDescriptions: 'Açıklamaları Kopyala',
            copyAsJSON: 'JSON olarak Kopyala',
            copyAsCSV: 'CSV olarak Kopyala',
            withHeaders: 'Başlıklarla',
            withoutHeaders: 'Başlıklar Olmadan',
            clearAll: 'Tümünü Temizle',
            cleared: 'Temizlendi!',
            copied: 'Kopyalandı!',
            nothingToCopy: 'Kopyalanacak bir şey yok!',
            languageSettings: 'Dil Ayarları',
            errorOccurred: 'Beklenmeyen bir hata oluştu',
            failedToParse: 'Açıklama ayrıştırılamadı:'
        },
        pt: {
            expandDescription: 'Expandir Descrição',
            hideDescription: 'Ocultar Descrição',
            loading: 'Carregando...',
            wallapopTools: 'Ferramentas Wallapop',
            filterUnwantedWords: 'Filtrar Palavras Indesejadas',
            example: 'Ex: mac, apple, macbook...',
            addAndApply: 'Adicionar e Aplicar',
            noWordsToFilter: 'Sem palavras para filtrar',
            remove: 'Remover',
            copyDescriptions: 'Copiar Descrições',
            copyAsJSON: 'Copiar como JSON',
            copyAsCSV: 'Copiar como CSV',
            withHeaders: 'Com Cabeçalhos',
            withoutHeaders: 'Sem Cabeçalhos',
            clearAll: 'Limpar Tudo',
            cleared: 'Limpo!',
            copied: 'Copiado!',
            nothingToCopy: 'Nada para copiar!',
            languageSettings: 'Configurações de Idioma',
            errorOccurred: 'Ocorreu um erro inesperado',
            failedToParse: 'Falha ao analisar descrição:'
        },
        it: {
            expandDescription: 'Espandi Descrizione',
            hideDescription: 'Nascondi Descrizione',
            loading: 'Caricamento...',
            wallapopTools: 'Strumenti Wallapop',
            filterUnwantedWords: 'Filtra Parole Indesiderate',
            example: 'Es: mac, apple, macbook...',
            addAndApply: 'Aggiungi e Applica',
            noWordsToFilter: 'Nessuna parola da filtrare',
            remove: 'Rimuovi',
            copyDescriptions: 'Copia Descrizioni',
            copyAsJSON: 'Copia come JSON',
            copyAsCSV: 'Copia come CSV',
            withHeaders: 'Con Intestazioni',
            withoutHeaders: 'Senza Intestazioni',
            clearAll: 'Cancella Tutto',
            cleared: 'Cancellato!',
            copied: 'Copiato!',
            nothingToCopy: 'Niente da copiare!',
            languageSettings: 'Impostazioni Lingua',
            errorOccurred: 'Si è verificato un errore imprevisto',
            failedToParse: 'Impossibile analizzare la descrizione:'
        },
        fr: {
            expandDescription: 'Développer Description',
            hideDescription: 'Masquer Description',
            loading: 'Chargement...',
            wallapopTools: 'Outils Wallapop',
            filterUnwantedWords: 'Filtrer les Mots Indésirables',
            example: 'Ex: mac, apple, macbook...',
            addAndApply: 'Ajouter et Appliquer',
            noWordsToFilter: 'Pas de mots à filtrer',
            remove: 'Supprimer',
            copyDescriptions: 'Copier les Descriptions',
            copyAsJSON: 'Copier en JSON',
            copyAsCSV: 'Copier en CSV',
            withHeaders: 'Avec En-têtes',
            withoutHeaders: 'Sans En-têtes',
            clearAll: 'Tout Effacer',
            cleared: 'Effacé !',
            copied: 'Copié !',
            nothingToCopy: 'Rien à copier !',
            languageSettings: 'Paramètres de Langue',
            errorOccurred: 'Une erreur inattendue s\'est produite',
            failedToParse: 'Échec de l\'analyse de la description :'
        },
        de: {
            expandDescription: 'Beschreibung Erweitern',
            hideDescription: 'Beschreibung Ausblenden',
            loading: 'Wird geladen...',
            wallapopTools: 'Wallapop-Werkzeuge',
            filterUnwantedWords: 'Unerwünschte Wörter Filtern',
            example: 'Z.B: mac, apple, macbook...',
            addAndApply: 'Hinzufügen und Anwenden',
            noWordsToFilter: 'Keine Wörter zum Filtern',
            remove: 'Entfernen',
            copyDescriptions: 'Beschreibungen Kopieren',
            copyAsJSON: 'Als JSON Kopieren',
            copyAsCSV: 'Als CSV Kopieren',
            withHeaders: 'Mit Überschriften',
            withoutHeaders: 'Ohne Überschriften',
            clearAll: 'Alles Löschen',
            cleared: 'Gelöscht!',
            copied: 'Kopiert!',
            nothingToCopy: 'Nichts zu kopieren!',
            languageSettings: 'Spracheinstellungen',
            errorOccurred: 'Ein unerwarteter Fehler ist aufgetreten',
            failedToParse: 'Fehler beim Analysieren der Beschreibung:'
        },
        nl: {
            expandDescription: 'Beschrijving Uitklappen',
            hideDescription: 'Beschrijving Verbergen',
            loading: 'Laden...',
            wallapopTools: 'Wallapop Hulpmiddelen',
            filterUnwantedWords: 'Ongewenste Woorden Filteren',
            example: 'Bijv: mac, apple, macbook...',
            addAndApply: 'Toevoegen en Toepassen',
            noWordsToFilter: 'Geen woorden om te filteren',
            remove: 'Verwijderen',
            copyDescriptions: 'Beschrijvingen Kopiëren',
            copyAsJSON: 'Kopiëren als JSON',
            copyAsCSV: 'Kopiëren als CSV',
            withHeaders: 'Met Headers',
            withoutHeaders: 'Zonder Headers',
            clearAll: 'Alles Wissen',
            cleared: 'Gewist!',
            copied: 'Gekopieerd!',
            nothingToCopy: 'Niets om te kopiëren!',
            languageSettings: 'Taalinstellingen',
            errorOccurred: 'Er is een onverwachte fout opgetreden',
            failedToParse: 'Kan beschrijving niet analyseren:'
        }
    };

    static getText(key) {
        const lang = this.currentLanguage;
        if (this.translations[lang] && this.translations[lang][key]) {
            return this.translations[lang][key];
        }
        // Fallback to English
        if (this.translations['en'] && this.translations['en'][key]) {
            return this.translations['en'][key];
        }
        // If key is missing completely, return the key itself
        return key;
    }

    static saveLanguagePreference() {
        try {
            localStorage.setItem('wallapop-language', this.currentLanguage);
            Logger.log("Language preference saved:", this.currentLanguage);
        } catch (error) {
            Logger.error(error, "Saving language preference");
        }
    }

    static loadLanguagePreference() {
        try {
            const savedLanguage = localStorage.getItem('wallapop-language');
            if (savedLanguage && this.availableLanguages[savedLanguage]) {
                this.currentLanguage = savedLanguage;
                Logger.log("Language preference loaded:", this.currentLanguage);
            } else {
                // Try to detect language from browser
                const browserLang = navigator.language.split('-')[0];
                if (this.availableLanguages[browserLang]) {
                    this.currentLanguage = browserLang;
                    Logger.log("Language detected from browser:", this.currentLanguage);
                }
            }
        } catch (error) {
            Logger.error(error, "Loading language preference");
        }
    }

    static setLanguage(lang) {
        if (this.availableLanguages[lang]) {
            this.currentLanguage = lang;
            this.saveLanguagePreference();
            return true;
        }
        return false;
    }
}

class DescriptionFetcher {
    static async getDescription(url) {
        Logger.log("Fetching description for URL:", url);
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: (response) => this.handleResponse(response, resolve, url),
                onerror: (error) => this.handleError(error, resolve)
            });
        });
    }

    static handleResponse(response, resolve, originalUrl) {
        try {
            // Parse the received response
            Logger.log("Response received with status:", response.status);

            const parser = new DOMParser();
            const doc = parser.parseFromString(response.responseText, "text/html");

            // Find the __NEXT_DATA__ script tag
            const nextDataScript = doc.querySelector('#__NEXT_DATA__');

            if (nextDataScript) {
                Logger.log("Found __NEXT_DATA__ script tag");

                try {
                    // Parse the JSON content
                    const jsonData = JSON.parse(nextDataScript.textContent);
                    Logger.log("JSON data parsed successfully");

                    // Extract the item description and title
                    let itemData = {};
                    if (jsonData.props?.pageProps?.item) {
                        const item = jsonData.props.pageProps.item;

                        // Get title
                        itemData.title = item.title?.original.trim() || "";

                        // Get description
                        if (item.description?.original) {
                            const description = item.description.original;
                            Logger.log("Description extracted from JSON:", description);

                            // Get the part before tag indicators like "No leer"
                            const cleanDescription = this.cleanDescription(description);
                            itemData.description = cleanDescription;

                            // Get the URL
                            itemData.url = originalUrl;

                            // Get price if available
                            itemData.price = item.price ? `${item.price.cash.amount} ${item.price.cash.currency}` : "";

                            resolve({success: true, data: itemData});
                        } else {
                            Logger.log("Description not found in JSON structure:", jsonData);
                            throw new Error("Description not found in JSON data");
                        }
                    } else {
                        Logger.log("Item data not found in JSON structure:", jsonData);
                        throw new Error("Item not found in JSON data");
                    }
                } catch (jsonError) {
                    Logger.error(jsonError, "Parsing JSON data");
                    throw jsonError;
                }
            } else {
                Logger.log("__NEXT_DATA__ script tag not found, trying old method");

                // Fall back to old method (for compatibility)
                const descriptionElement = doc.querySelector(SELECTORS.ITEM_DESCRIPTION);
                if (descriptionElement) {
                    const description = descriptionElement.querySelector(".mt-2")?.innerHTML.trim();
                    if (description) {
                        Logger.log("Description found using old method");

                        // In old method, we can't get the title easily, so we'll use the URL
                        const itemData = {
                            title: doc.querySelector('title')?.textContent || originalUrl,
                            description: description,
                            url: originalUrl,
                            price: doc.querySelector('[class*="ItemDetail__price"]')?.textContent || ""
                        };

                        resolve({success: true, data: itemData});
                        return;
                    }
                }

                throw new Error("Description not found with any method");
            }
        } catch (error) {
            Logger.error(error, "Parsing response");
            resolve({success: false, error: "Failed to parse description: " + error.message});
        }
    }

    // Method to clean tags from the description
    static cleanDescription(description) {
        // Look for tag indicators like "No leer"
        const tagMarkers = [
            "\n\n\n\n\n\n\nNo leer\n",
            "\n\n\n\n\nNo leer\n",
            "\nNo leer\n",
            "\n\nNo leer\n",
            "No leer",
            "tags:",
            "etiquetas:",
            "keywords:"
        ];

        // Check each marker and split at the first one found
        let cleanDesc = description;

        for (const marker of tagMarkers) {
            if (description.includes(marker)) {
                Logger.log(`Found tag marker: "${marker}"`);
                cleanDesc = description.split(marker)[0].trim();
                break;
            }
        }

        // Clean excessive empty lines (reduce more than 3 newlines to 2)
        cleanDesc = cleanDesc.replace(/\n{3,}/g, "\n\n");

        return cleanDesc;
    }

    static handleError(error, resolve) {
        Logger.error(error, "XML HTTP Request");
        resolve({success: false, error: "Network error occurred"});
    }
}

// Storage for expanded descriptions - global manager
class DescriptionManager {
    static expandedItems = [];

    static addItem(itemData) {
        // Check if the item already exists by URL
        const existingIndex = this.expandedItems.findIndex(item => item.url === itemData.url);
        if (existingIndex >= 0) {
            // Update existing item
            this.expandedItems[existingIndex] = itemData;
        } else {
            // Add new item
            this.expandedItems.push(itemData);
        }
        Logger.log("Item added to description manager:", itemData.title);
        Logger.log("Total items:", this.expandedItems.length);

        // Update control panel visibility
        ControlPanel.updatePanelVisibility();
    }

    static removeItem(url) {
        const index = this.expandedItems.findIndex(item => item.url === url);
        if (index >= 0) {
            this.expandedItems.splice(index, 1);
            Logger.log("Item removed from description manager:", url);
            Logger.log("Total items:", this.expandedItems.length);

            // Update control panel visibility
            ControlPanel.updatePanelVisibility();
        }
    }

    static clearItems() {
        this.expandedItems = [];
        Logger.log("All items cleared from description manager");
        ControlPanel.updatePanelVisibility();
    }

    static getItemsAsJson() {
        return JSON.stringify(this.expandedItems, null, 2);
    }

    static getItemsAsCsv(includeHeaders = true) {
        if (this.expandedItems.length === 0) {
            return "";
        }

        // Define headers
        const headers = ["Title", "Description", "Price", "URL"];

        // Create CSV rows
        let csvContent = includeHeaders ? headers.join(",") + "\n" : "";

        this.expandedItems.forEach(item => {
            // Properly escape CSV fields
            const escapeCsvField = (field) => {
                field = String(field || "");
                // If field contains comma, newline or double quote, enclose in double quotes
                if (field.includes(",") || field.includes("\n") || field.includes("\"")) {
                    // Replace double quotes with two double quotes
                    field = field.replace(/"/g, "\"\"");
                    return `"${field}"`;
                }
                return field;
            };

            const row = [
                escapeCsvField(item.title),
                escapeCsvField(item.description),
                escapeCsvField(item.price),
                escapeCsvField(item.url)
            ];

            csvContent += row.join(",") + "\n";
        });

        return csvContent;
    }
}

class ExpandButton {
    constructor(anchorElement, url) {
        this.anchorElement = anchorElement;
        this.url = url;
        this.button = null;
        this.descriptionContent = null;
        this.expanded = false;
        this.itemData = null;
        this.createButton();
    }

    createButton() {
        Logger.log("Creating expand button for URL:", this.url);
        this.button = document.createElement('button');
        this.button.textContent = TranslationManager.getText('expandDescription');
        this.button.className = SELECTORS.EXPAND_BUTTON.slice(1); // Remove the leading dot

        this.descriptionContent = document.createElement('div');
        this.descriptionContent.className = 'description-content';

        this.button.addEventListener('click', this.handleClick.bind(this));

        const container = document.createElement('div');
        container.appendChild(this.button);
        container.appendChild(this.descriptionContent);

        this.anchorElement.appendChild(container);
        Logger.log("Expand button added for URL:", this.url);
    }

    async handleClick(event) {
        event.preventDefault();
        event.stopPropagation();
        Logger.log("Expand button clicked for URL:", this.url);
        try {
            if (!this.expanded) {
                await this.expandDescription();
            } else {
                this.hideDescription();
            }
        } catch (error) {
            Logger.error(error, "Button click handler");
            this.showError("An unexpected error occurred");
        }
    }

    async expandDescription() {
        this.button.textContent = TranslationManager.getText('loading');
        const result = await DescriptionFetcher.getDescription(this.url);
        if (result.success) {
            this.itemData = result.data;
            this.descriptionContent.innerHTML = HTMLUtils.escapeHTML(result.data.description);
            // Use the class toggle approach for smooth transition
            this.descriptionContent.classList.add('expanded');
            this.button.textContent = TranslationManager.getText('hideDescription');
            this.expanded = true;

            // Add to global description manager
            DescriptionManager.addItem(this.itemData);

            Logger.log("Description expanded for URL:", this.url);
        } else {
            this.showError(result.error);
        }
    }

    hideDescription() {
        // Remove expanded class for smooth transition
        this.descriptionContent.classList.remove('expanded');

        // Use transition end event to clean up
        const transitionEnded = () => {
            if (!this.expanded) {
                // Do any additional cleanup here if needed
            }
            this.descriptionContent.removeEventListener('transitionend', transitionEnded);
        };
        this.descriptionContent.addEventListener('transitionend', transitionEnded);

        this.button.textContent = TranslationManager.getText('expandDescription');
        this.expanded = false;

        // Remove from global description manager
        if (this.itemData) {
            DescriptionManager.removeItem(this.url);
        }

        Logger.log("Description hidden for URL:", this.url);
    }

    showError(message) {
        if (message.startsWith('Failed to parse description:')) {
            message = TranslationManager.getText('failedToParse') + message.substring('Failed to parse description:'.length);
        } else if (message === 'An unexpected error occurred') {
            message = TranslationManager.getText('errorOccurred');
        }
        this.descriptionContent.innerHTML = `<span class="error-message">${message}</span>`;
        this.descriptionContent.classList.add('expanded');
        this.button.textContent = TranslationManager.getText('expandDescription');
        this.expanded = false;
        Logger.log("Error displaying description for URL:", this.url, message);
    }
}

class ListingManager {
    static addExpandButtonsToListings() {
        Logger.log("Adding expand buttons to listings");
        let totalListings = 0;

        SELECTORS.ITEM_CARDS.forEach(selector => {
            const listings = document.querySelectorAll(selector);
            totalListings += listings.length;
            Logger.log(`Found ${listings.length} items for selector: ${selector}`);

            listings.forEach(listing => {
                try {
                    let href = listing.getAttribute('href') || listing.querySelector('a')?.getAttribute('href');

                    // Make sure href is a full URL
                    if (href && !href.startsWith('http')) {
                        if (href.startsWith('/')) {
                            href = `https://es.wallapop.com${href}`;
                        } else {
                            href = `https://es.wallapop.com/${href}`;
                        }
                    }

                    if (href && !listing.querySelector(SELECTORS.EXPAND_BUTTON)) {
                        new ExpandButton(listing, href);
                    } else if (!href) {
                        Logger.log("No valid href found for a listing");
                    }
                } catch (error) {
                    Logger.error(error, "Processing individual listing");
                }
            });
        });

        Logger.log("Total listings processed:", totalListings);
    }
}

class DOMObserver {
    constructor() {
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.lastUrl = location.href;
    }

    observe() {
        this.observer.observe(document.body, {childList: true, subtree: true});
        window.addEventListener('popstate', this.handleUrlChange.bind(this));
        Logger.log("MutationObserver and popstate listener set up");
    }

    handleMutations(mutations) {
        for (let mutation of mutations) {
            if (mutation.type === 'childList') {
                const addedNodes = Array.from(mutation.addedNodes);
                const hasNewItemCards = addedNodes.some(node =>
                    node.nodeType === Node.ELEMENT_NODE &&
                    SELECTORS.ITEM_CARDS.some(selector =>
                        node.matches(selector) || node.querySelector(selector)
                    )
                );
                if (hasNewItemCards) {
                    Logger.log("New ItemCards detected, adding expand buttons");
                    ListingManager.addExpandButtonsToListings();

                    // Apply filters to new listings
                    FilterManager.applyFilters();
                }
            }
        }
        this.checkUrlChange();
    }

    checkUrlChange() {
        if (this.lastUrl !== location.href) {
            Logger.log("URL changed:", location.href);
            this.lastUrl = location.href;
            this.handleUrlChange();
        }
    }

    handleUrlChange() {
        Logger.log("Handling URL change");
        setTimeout(() => {
            ListingManager.addExpandButtonsToListings();
            // Apply filters after URL change
            FilterManager.applyFilters();
        }, 1000); // Delay to allow for dynamic content to load
    }
}

class WallapopExpandDescription {
    static async init() {
        Logger.log("Initializing script");

        // Load language preference first
        TranslationManager.loadLanguagePreference();

        StyleManager.addStyles();

        // Create unified control panel
        ControlPanel.createControlPanel();

        await this.waitForElements(SELECTORS.ITEM_CARDS);
        ListingManager.addExpandButtonsToListings();

        // Apply filters to initial listings
        ControlPanel.applyFilters();

        new DOMObserver().observe();
    }

    static waitForElements(selectors, timeout = 10000) {
        Logger.log("Waiting for elements:", selectors);
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkElements() {
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        Logger.log("Elements found:", selector, elements.length);
                        resolve(elements);
                        return;
                    }
                }

                if (Date.now() - startTime > timeout) {
                    Logger.log("Timeout waiting for elements");
                    reject(new Error(`Timeout waiting for elements`));
                } else {
                    requestAnimationFrame(checkElements);
                }
            }

            checkElements();
        });
    }
}

/**
 * Reusable Toggler Component
 * Handles section toggling with consistent behavior
 */
class SectionToggler {
    /**
     * Create a new section toggler
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - Container element for the toggle section
     * @param {String} options.sectionClass - Base class name for the section
     * @param {String} options.titleText - Text to display in the section title
     * @param {Boolean} options.isExpanded - Initial expanded state
     * @param {Function} options.contentCreator - Function to create section content
     * @param {Function} options.onToggle - Callback when toggle state changes
     */
    constructor(options) {
        this.container = options.container;
        this.sectionClass = options.sectionClass;
        this.titleText = options.titleText;
        this.isExpanded = options.isExpanded !== undefined ? options.isExpanded : true;
        this.contentCreator = options.contentCreator;
        this.onToggle = options.onToggle;

        this.section = null;
        this.toggleElement = null;
        this.contentElement = null;

        this.create();
    }

    /**
     * Create the toggle section
     * @returns {HTMLElement} The created section element
     */
    create() {
        // Create section container
        this.section = document.createElement('div');
        this.section.className = `panel-section ${this.sectionClass}-section`;

        // Create section title
        const titleElement = document.createElement('div');
        titleElement.className = 'section-title';
        titleElement.innerHTML = `<span>${this.titleText}</span><span class="section-toggle">▼</span>`;
        this.toggleElement = titleElement.querySelector('.section-toggle');

        // Add toggle behavior
        titleElement.addEventListener('click', () => this.toggle());
        this.section.appendChild(titleElement);

        // Create content container
        this.contentElement = document.createElement('div');
        this.contentElement.className = `section-content ${this.sectionClass}-content`;

        // Apply initial state
        if (!this.isExpanded) {
            this.contentElement.classList.add('collapsed');
            this.toggleElement.style.transform = 'rotate(-90deg)';
        }

        // Create content
        if (this.contentCreator) {
            this.contentCreator(this.contentElement);
        }

        this.section.appendChild(this.contentElement);

        // Add to container if provided
        if (this.container) {
            this.container.appendChild(this.section);
        }

        return this.section;
    }

    /**
     * Toggle the section expanded/collapsed state
     */
    toggle() {
        this.isExpanded = !this.isExpanded;

        if (this.isExpanded) {
            this.contentElement.classList.remove('collapsed');
            this.toggleElement.style.transform = 'rotate(0deg)';
        } else {
            this.contentElement.classList.add('collapsed');
            this.toggleElement.style.transform = 'rotate(-90deg)';
        }

        // Execute callback if provided
        if (this.onToggle) {
            this.onToggle(this.isExpanded);
        }
    }

    /**
     * Get the current expanded state
     * @returns {Boolean} True if expanded, false if collapsed
     */
    getState() {
        return this.isExpanded;
    }

    /**
     * Set the expanded state
     * @param {Boolean} expanded - Whether the section should be expanded
     */
    setState(expanded) {
        if (this.isExpanded !== expanded) {
            this.toggle();
        }
    }
}

class ControlPanel {
    static blockedTerms = [];
    static container = null;
    static filterInputElement = null;
    static blockedTermsListElement = null;

    // Store togglers for state management
    static togglers = {
        panel: null,
        filter: null,
        copy: null,
        language: null
    };

    /**
     * Create a button with standard style
     */
    static createButton(text, className, clickHandler) {
        const button = document.createElement('button');
        button.className = className;
        button.textContent = text;

        if (clickHandler) {
            button.addEventListener('click', clickHandler);
        }

        return button;
    }

    /**
     * Create the filter section
     */
    static createFilterSection(container) {
        // Load saved state
        const isExpanded = this.loadPanelState('isFilterSectionExpanded', true);

        this.togglers.filter = new SectionToggler({
            container,
            sectionClass: 'filter',
            titleText: TranslationManager.getText('filterUnwantedWords'),
            isExpanded,
            onToggle: (state) => {
                this.savePanelState('isFilterSectionExpanded', state);
            },
            contentCreator: (content) => {
                // Filter input
                this.filterInputElement = document.createElement('input');
                this.filterInputElement.className = 'filter-input';
                this.filterInputElement.placeholder = TranslationManager.getText('example');

                // Add enter key listener
                this.filterInputElement.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.addBlockedTerm();
                    }
                });

                content.appendChild(this.filterInputElement);

                // Apply button
                const applyButton = this.createButton(
                    TranslationManager.getText('addAndApply'),
                    'panel-button filter-apply',
                    () => this.addBlockedTerm()
                );
                content.appendChild(applyButton);

                // Create list for blocked terms
                this.blockedTermsListElement = document.createElement('div');
                this.blockedTermsListElement.className = 'blocked-terms-list';
                content.appendChild(this.blockedTermsListElement);
            }
        });

        return this.togglers.filter.section;
    }

    /**
     * Create the copy section
     */
    static createCopySection(container) {
        // Load saved state
        const isExpanded = this.loadPanelState('isCopySectionExpanded', true);

        this.togglers.copy = new SectionToggler({
            container,
            sectionClass: 'copy',
            titleText: TranslationManager.getText('copyDescriptions'),
            isExpanded,
            onToggle: (state) => {
                this.savePanelState('isCopySectionExpanded', state);
            },
            contentCreator: (content) => {
                // JSON copy button
                const jsonButton = this.createButton(
                    TranslationManager.getText('copyAsJSON'),
                    'panel-button copy-json',
                    () => this.copyToClipboard('json')
                );
                content.appendChild(jsonButton);

                // Create CSV dropdown
                const csvDropdown = document.createElement('div');
                csvDropdown.className = 'copy-dropdown';

                const csvButton = this.createButton(
                    TranslationManager.getText('copyAsCSV'),
                    'panel-button copy-csv'
                );

                const dropdownContent = document.createElement('div');
                dropdownContent.className = 'dropdown-content';

                // Add mouseover listeners for dropdown positioning
                csvButton.addEventListener('mouseenter', () => this.positionDropdown());
                csvDropdown.addEventListener('mouseenter', () => this.positionDropdown());

                // Create dropdown options
                const csvWithHeadersButton = this.createButton(
                    TranslationManager.getText('withHeaders'),
                    '',
                    () => this.copyToClipboard('csv', true)
                );

                const csvWithoutHeadersButton = this.createButton(
                    TranslationManager.getText('withoutHeaders'),
                    '',
                    () => this.copyToClipboard('csv', false)
                );

                dropdownContent.appendChild(csvWithHeadersButton);
                dropdownContent.appendChild(csvWithoutHeadersButton);

                csvDropdown.appendChild(csvButton);
                csvDropdown.appendChild(dropdownContent);
                content.appendChild(csvDropdown);

                // Create clear button
                const clearButton = this.createButton(
                    TranslationManager.getText('clearAll'),
                    'panel-button copy-clear',
                    () => {
                        DescriptionManager.clearItems();
                        this.showCopySuccess(clearButton, TranslationManager.getText('cleared'));
                    }
                );
                content.appendChild(clearButton);
            }
        });

        return this.togglers.copy.section;
    }

    /**
     * Create the language section
     */
    static createLanguageSection(container) {
        // Load saved state
        const isExpanded = this.loadPanelState('isLanguageSectionExpanded', true);

        this.togglers.language = new SectionToggler({
            container,
            sectionClass: 'language',
            titleText: TranslationManager.getText('languageSettings'),
            isExpanded,
            onToggle: (state) => {
                this.savePanelState('isLanguageSectionExpanded', state);
            },
            contentCreator: (content) => {
                // Create language selector
                const languageSelector = document.createElement('div');
                languageSelector.className = 'language-selector';

                // Add language options
                Object.entries(TranslationManager.availableLanguages).forEach(([code, name]) => {
                    const langButton = document.createElement('button');
                    langButton.className = `lang-button ${code === TranslationManager.currentLanguage ? 'active' : ''}`;
                    langButton.dataset.lang = code;
                    langButton.textContent = name;

                    langButton.addEventListener('click', () => {
                        if (TranslationManager.setLanguage(code)) {
                            // Mark this button as active and others as inactive
                            document.querySelectorAll('.lang-button').forEach(btn => {
                                btn.classList.toggle('active', btn.dataset.lang === code);
                            });

                            // Update all text in the UI
                            this.updateUILanguage();
                        }
                    });

                    languageSelector.appendChild(langButton);
                });

                content.appendChild(languageSelector);
            }
        });

        return this.togglers.language.section;
    }

    /**
     * Create the main control panel
     */
    static createControlPanel() {
        // Create control panel if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'control-panel';

            // Load panel expanded state
            const isPanelExpanded = this.loadPanelState('isPanelExpanded', true);

            // Create panel content container
            const contentContainer = document.createElement('div');
            contentContainer.className = 'panel-content';

            // Create panel toggler (header)
            this.togglers.panel = new SectionToggler({
                sectionClass: 'panel',
                titleText: TranslationManager.getText('wallapopTools'),
                isExpanded: isPanelExpanded,
                onToggle: (state) => {
                    this.savePanelState('isPanelExpanded', state);
                    // Unlike other togglers, we need to manually toggle content visibility
                    // since we're using header + separate content container
                    if (state) {
                        contentContainer.classList.remove('collapsed');
                    } else {
                        contentContainer.classList.add('collapsed');
                    }
                }
            });

            // Remove section class and add panel-title class
            this.togglers.panel.section.className = '';
            this.togglers.panel.section.querySelector('.section-title').className = 'panel-title';

            // Add header to container
            this.container.appendChild(this.togglers.panel.section.querySelector('.panel-title'));

            // Apply initial collapsed state if needed
            if (!isPanelExpanded) {
                contentContainer.classList.add('collapsed');
            }

            // Add all sections to content container
            this.createFilterSection(contentContainer);
            this.createCopySection(contentContainer);
            this.createLanguageSection(contentContainer);

            // Add content container to main container
            this.container.appendChild(contentContainer);
            document.body.appendChild(this.container);

            // Apply initial state
            this.updateUILanguage();
            this.loadBlockedTerms();

            Logger.log("Control panel created with SectionToggler");
        }
    }

    /**
     * Save a specific panel state to localStorage
     */
    static savePanelState(key, value) {
        try {
            // Get existing states or create new object
            let states = {};
            try {
                const savedStates = localStorage.getItem('wallapop-panel-states');
                if (savedStates) {
                    states = JSON.parse(savedStates);
                }
            } catch (e) {
                Logger.error(e, "Parsing saved panel states");
            }

            // Update specific state
            states[key] = value;

            // Save back to localStorage
            localStorage.setItem('wallapop-panel-states', JSON.stringify(states));
            Logger.log(`Panel state saved: ${key} = ${value}`);
        } catch (error) {
            Logger.error(error, "Saving panel state");
        }
    }

    /**
     * Load a specific panel state from localStorage
     */
    static loadPanelState(key, defaultValue) {
        try {
            const savedStates = localStorage.getItem('wallapop-panel-states');
            if (savedStates) {
                const states = JSON.parse(savedStates);
                if (key in states) {
                    return states[key];
                }
            }
        } catch (error) {
            Logger.error(error, "Loading panel state");
        }
        return defaultValue;
    }

    /**
     * Save all panel states at once
     */
    static savePanelStates() {
        const states = {};

        // Get states from all togglers
        for (const [key, toggler] of Object.entries(this.togglers)) {
            if (toggler) {
                states[`is${key.charAt(0).toUpperCase() + key.slice(1)}SectionExpanded`] = toggler.getState();
            }
        }

        try {
            localStorage.setItem('wallapop-panel-states', JSON.stringify(states));
            Logger.log("All panel states saved");
        } catch (error) {
            Logger.error(error, "Saving all panel states");
        }
    }

    // Other methods remain the same
    // ... (all the other methods that don't involve toggling)

    // Only including a few key methods to show the pattern:

    /**
     * Position dropdown based on available space
     */
    static positionDropdown() {
        const dropdownContent = this.container.querySelector('.dropdown-content');
        const dropdownButton = this.container.querySelector('.copy-dropdown .panel-button');

        // Reset position classes
        dropdownContent.classList.remove('top');

        // Check if dropdown would go out of viewport at the bottom
        const viewportHeight = window.innerHeight;
        const buttonRect = dropdownButton.getBoundingClientRect();
        const dropdownHeight = 82; // Approximate height of dropdown when expanded

        // If not enough space below, position above
        if (viewportHeight - buttonRect.bottom < dropdownHeight) {
            dropdownContent.classList.add('top');
        }
    }

    /**
     * Update UI text for all elements based on selected language
     */
    static updateUILanguage() {
        if (!this.container) return;

        // Helper function to update text of elements matching a selector
        const updateText = (selector, translationKey) => {
            const element = this.container.querySelector(selector);
            if (element) {
                element.textContent = TranslationManager.getText(translationKey);
            }
        };

        // Update panel title
        updateText('.panel-title span:first-child', 'wallapopTools');

        // Update section titles
        updateText('.filter-section .section-title span:first-child', 'filterUnwantedWords');
        updateText('.copy-section .section-title span:first-child', 'copyDescriptions');
        updateText('.language-section .section-title span:first-child', 'languageSettings');

        // Update filter section
        if (this.filterInputElement) {
            this.filterInputElement.placeholder = TranslationManager.getText('example');
        }
        updateText('.filter-apply', 'addAndApply');

        // Update empty message if visible
        const emptyMessage = this.container.querySelector('.blocked-terms-list div[style*="italic"]');
        if (emptyMessage) {
            emptyMessage.textContent = TranslationManager.getText('noWordsToFilter');
        }

        // Update copy section buttons
        updateText('.copy-json', 'copyAsJSON');
        updateText('.copy-csv', 'copyAsCSV');
        updateText('.dropdown-content button:first-child', 'withHeaders');
        updateText('.dropdown-content button:last-child', 'withoutHeaders');
        updateText('.copy-clear', 'clearAll');

        // Update all expand buttons on the page
        document.querySelectorAll(SELECTORS.EXPAND_BUTTON).forEach(button => {
            if (!button.textContent.includes('...')) {
                if (button.textContent.includes('Hide')) {
                    button.textContent = TranslationManager.getText('hideDescription');
                } else {
                    button.textContent = TranslationManager.getText('expandDescription');
                }
            }
        });
    }
}

// Script initialization
Logger.log("Script loaded, waiting for page to be ready");
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', WallapopExpandDescription.init.bind(WallapopExpandDescription));
    Logger.log("Added DOMContentLoaded event listener");
} else {
    Logger.log("Document already loaded, initializing script immediately");
    WallapopExpandDescription.init();
}