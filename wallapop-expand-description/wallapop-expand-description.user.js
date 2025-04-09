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
        
        /* Export Format Styles */
        .export-section {
            position: relative;
        }
        
        .format-selector-container {
            position: relative;
            margin-top: 10px;
        }
        
        .format-selector {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            background-color: white;
            text-align: left;
            position: relative;
        }
        
        .format-selector:after {
            content: '▼';
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
        }
        
        .format-dropdown {
            position: absolute;
            width: 100%;
            max-height: 0;
            overflow: hidden;
            background-color: white;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            z-index: 10;
            transition: max-height var(--transition-speed) var(--transition-easing);
        }
        
        .format-dropdown.active {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ccc;
        }
        
        .format-categories {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .format-category-label {
            padding: 8px 12px;
            font-weight: bold;
            background-color: #f5f5f5;
            border-bottom: 1px solid #eee;
        }
        
        .format-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .format-item {
            position: relative;
            cursor: pointer;
        }
        
        .format-label {
            padding: 8px 12px 8px 20px;
            border-bottom: 1px solid #eee;
        }
        
        .format-item.selected .format-label {
            background-color: #e0f0f0;
            color: var(--panel-accent-color);
        }
        
        .format-item:hover .format-label {
            background-color: #f0f0f0;
        }
        
        .options-toggle {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            font-size: 12px;
            color: #777;
            cursor: pointer;
            padding: 4px;
        }
        
        .format-options {
            padding: 5px 10px;
            background-color: #f9f9f9;
            border-bottom: 1px solid #eee;
        }
        
        .format-options.hidden {
            display: none;
        }
        
        .option-row {
            display: flex;
            align-items: center;
            margin: 5px 0;
        }
        
        .option-checkbox {
            margin-right: 8px;
        }
        
        .option-label {
            font-size: 12px;
            color: #555;
        }
        
        .export-button {
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
        
        .export-button:hover {
            background-color: var(--panel-hover-color);
        }
        
        .export-success {
            background-color: #4CAF50;
            transition: background-color var(--transition-speed) var(--transition-easing);
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
            failedToParse: 'Failed to parse description:',
            // New entries for export functionality
            selectFormat: 'Select Format',
            exportData: 'Export',
            exportDescriptions: 'Export Descriptions'
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
            failedToParse: 'Error al analizar la descripción:',
            // New entries for export functionality
            selectFormat: 'Seleccionar Formato',
            exportData: 'Exportar',
            exportDescriptions: 'Exportar Descripciones'
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
            failedToParse: 'Error en analitzar la descripció:',
            // New entries for export functionality
            selectFormat: 'Seleccionar Format',
            exportData: 'Exportar',
            exportDescriptions: 'Exportar Descripcions'
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
            failedToParse: 'Açıklama ayrıştırılamadı:',
            // New entries for export functionality
            selectFormat: 'Format Seçin',
            exportData: 'Dışa Aktar',
            exportDescriptions: 'Açıklamaları Dışa Aktar'
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
            failedToParse: 'Falha ao analisar descrição:',
            // New entries for export functionality
            selectFormat: 'Selecionar Formato',
            exportData: 'Exportar',
            exportDescriptions: 'Exportar Descrições'
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
            failedToParse: 'Impossibile analizzare la descrizione:',
            // New entries for export functionality
            selectFormat: 'Seleziona Formato',
            exportData: 'Esporta',
            exportDescriptions: 'Esporta Descrizioni'
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
            failedToParse: 'Échec de l\'analyse de la description :',
            // New entries for export functionality
            selectFormat: 'Sélectionner Format',
            exportData: 'Exporter',
            exportDescriptions: 'Exporter les Descriptions'
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
            failedToParse: 'Fehler beim Analysieren der Beschreibung:',
            // New entries for export functionality
            selectFormat: 'Format Auswählen',
            exportData: 'Exportieren',
            exportDescriptions: 'Beschreibungen Exportieren'
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
            failedToParse: 'Kan beschrijving niet analyseren:',
            // New entries for export functionality
            selectFormat: 'Selecteer Formaat',
            exportData: 'Exporteren',
            exportDescriptions: 'Beschrijvingen Exporteren'
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

/**
 * FormatOption - A reusable component for format selection with conditional options
 */
class FormatOption {
    constructor(config) {
        this.id = config.id;
        this.label = config.label;
        this.description = config.description;
        this.category = config.category;
        this.options = config.options || [];
        this.element = null;
        this.optionsContainer = null;
        this.optionValues = {};

        // Initialize default values for options
        this.options.forEach(option => {
            this.optionValues[option.id] = option.defaultValue || false;
        });
    }

    /**
     * Create the DOM element for this format option
     * @param {Function} onSelect - Callback when this option is selected
     * @returns {HTMLElement} The created element
     */
    createElement(onSelect) {
        // Create main format item
        this.element = document.createElement('li');
        this.element.className = 'format-item';
        this.element.dataset.formatId = this.id;
        this.element.dataset.category = this.category;

        const formatLabel = document.createElement('div');
        formatLabel.className = 'format-label';
        formatLabel.textContent = this.label;
        formatLabel.title = this.description;

        this.element.appendChild(formatLabel);

        // Handle format selection
        formatLabel.addEventListener('click', (e) => {
            if (onSelect) {
                onSelect(this);
            }
            e.stopPropagation();
        });

        // Create options container if this format has options
        if (this.options.length > 0) {
            this.optionsContainer = document.createElement('div');
            this.optionsContainer.className = 'format-options hidden';

            // Create each option checkbox
            this.options.forEach(option => {
                const optionRow = document.createElement('div');
                optionRow.className = 'option-row';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `option-${this.id}-${option.id}`;
                checkbox.className = 'option-checkbox';
                checkbox.checked = option.defaultValue || false;

                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.className = 'option-label';
                label.textContent = option.label;
                label.title = option.description || '';

                // Handle checkbox change
                checkbox.addEventListener('change', (e) => {
                    this.optionValues[option.id] = e.target.checked;
                    e.stopPropagation();
                });

                optionRow.appendChild(checkbox);
                optionRow.appendChild(label);
                this.optionsContainer.appendChild(optionRow);
            });

            this.element.appendChild(this.optionsContainer);

            // Add expand/collapse capability for options
            const expandButton = document.createElement('button');
            expandButton.className = 'options-toggle';
            expandButton.innerHTML = '⚙️';
            expandButton.title = 'Format Options';
            formatLabel.appendChild(expandButton);

            expandButton.addEventListener('click', (e) => {
                this.toggleOptions();
                e.stopPropagation();
            });
        }

        return this.element;
    }

    /**
     * Toggle options visibility
     */
    toggleOptions() {
        if (this.optionsContainer) {
            this.optionsContainer.classList.toggle('hidden');
        }
    }

    /**
     * Show options panel
     */
    showOptions() {
        if (this.optionsContainer) {
            this.optionsContainer.classList.remove('hidden');
        }
    }

    /**
     * Hide options panel
     */
    hideOptions() {
        if (this.optionsContainer) {
            this.optionsContainer.classList.add('hidden');
        }
    }

    /**
     * Get all options values
     * @returns {Object} The options values
     */
    getOptions() {
        return this.optionValues;
    }

    /**
     * Get a specific option value
     * @param {String} optionId - The option ID
     * @returns {*} The option value
     */
    getOption(optionId) {
        return this.optionValues[optionId];
    }

    /**
     * Set a specific option value
     * @param {String} optionId - The option ID
     * @param {*} value - The value to set
     */
    setOption(optionId, value) {
        this.optionValues[optionId] = value;

        // Update checkbox if it exists
        const checkbox = this.element.querySelector(`#option-${this.id}-${optionId}`);
        if (checkbox) {
            checkbox.checked = value;
        }
    }

    /**
     * Mark this format as selected
     */
    select() {
        if (this.element) {
            this.element.classList.add('selected');
        }
    }

    /**
     * Unselect this format
     */
    unselect() {
        if (this.element) {
            this.element.classList.remove('selected');
        }
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
    static exportFormats = {
        // Text-based formats
        text: {
            label: 'Text',
            formats: {
                'plain': new FormatOption({
                    id: 'plain',
                    label: 'Plain Text',
                    description: 'Simple text list of descriptions',
                    category: 'text',
                    options: [
                        {
                            id: 'include-images',
                            label: 'Include images as URLs',
                            description: 'Add image URLs to the output',
                            defaultValue: false
                        }
                    ]
                }),
                'markdown': new FormatOption({
                    id: 'markdown',
                    label: 'Markdown',
                    description: 'Formatted with Markdown syntax',
                    category: 'text',
                    options: [
                        {
                            id: 'include-images',
                            label: 'Include images as markdown',
                            description: 'Add image references using markdown syntax',
                            defaultValue: true
                        },
                        {
                            id: 'use-frontmatter',
                            label: 'Use frontmatter',
                            description: 'Add YAML frontmatter with metadata',
                            defaultValue: false
                        }
                    ]
                }),
                'html': new FormatOption({
                    id: 'html',
                    label: 'HTML',
                    description: 'Formatted as HTML document',
                    category: 'text',
                    options: [
                        {
                            id: 'include-images',
                            label: 'Include images',
                            description: 'Add image elements with source URLs',
                            defaultValue: true
                        },
                        {
                            id: 'include-styles',
                            label: 'Include CSS styles',
                            description: 'Add CSS styling to the HTML',
                            defaultValue: true
                        }
                    ]
                })
            }
        },
        // Data formats
        data: {
            label: 'Data',
            formats: {
                'json': new FormatOption({
                    id: 'json',
                    label: 'JSON',
                    description: 'JavaScript Object Notation',
                    category: 'data',
                    options: [
                        {
                            id: 'pretty-print',
                            label: 'Pretty print',
                            description: 'Format JSON with indentation',
                            defaultValue: true
                        },
                        {
                            id: 'include-images',
                            label: 'Include image URLs',
                            description: 'Add image URLs to JSON objects',
                            defaultValue: false
                        }
                    ]
                }),
                'csv': new FormatOption({
                    id: 'csv',
                    label: 'CSV',
                    description: 'Comma-separated values',
                    category: 'data',
                    options: [
                        {
                            id: 'include-headers',
                            label: 'Include headers',
                            description: 'Add column names as the first row',
                            defaultValue: true
                        },
                        {
                            id: 'include-images',
                            label: 'Include image URLs',
                            description: 'Add image URLs column',
                            defaultValue: false
                        }
                    ]
                }),
                'tsv': new FormatOption({
                    id: 'tsv',
                    label: 'TSV',
                    description: 'Tab-separated values',
                    category: 'data',
                    options: [
                        {
                            id: 'include-headers',
                            label: 'Include headers',
                            description: 'Add column names as the first row',
                            defaultValue: true
                        },
                        {
                            id: 'include-images',
                            label: 'Include image URLs',
                            description: 'Add image URLs column',
                            defaultValue: false
                        }
                    ]
                }),
                'xml': new FormatOption({
                    id: 'xml',
                    label: 'XML',
                    description: 'Extensible Markup Language',
                    category: 'data',
                    options: [
                        {
                            id: 'include-images',
                            label: 'Include image elements',
                            description: 'Add image URLs as XML elements',
                            defaultValue: false
                        },
                        {
                            id: 'pretty-print',
                            label: 'Pretty print',
                            description: 'Format XML with indentation',
                            defaultValue: true
                        }
                    ]
                })
            }
        },
        // Spreadsheet formats
        spreadsheet: {
            label: 'Spreadsheet',
            formats: {
                'excel-csv': new FormatOption({
                    id: 'excel-csv',
                    label: 'Excel CSV',
                    description: 'CSV optimized for Excel import',
                    category: 'spreadsheet',
                    options: [
                        {
                            id: 'include-headers',
                            label: 'Include headers',
                            description: 'Add column names as the first row',
                            defaultValue: true
                        },
                        {
                            id: 'include-images',
                            label: 'Include image URLs',
                            description: 'Add image URLs column',
                            defaultValue: false
                        }
                    ]
                }),
                'excel-xml': new FormatOption({
                    id: 'excel-xml',
                    label: 'Excel XML',
                    description: 'XML format for Excel',
                    category: 'spreadsheet',
                    options: [
                        {
                            id: 'include-headers',
                            label: 'Include headers',
                            description: 'Add column names as the first row',
                            defaultValue: true
                        },
                        {
                            id: 'include-images',
                            label: 'Include image URLs',
                            description: 'Add image URLs column',
                            defaultValue: false
                        }
                    ]
                })
            }
        }
    };

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

        // Load the last selected format
        let lastSelectedFormat = this.loadExportFormat();

        // Keep track of the current selected format
        let selectedFormat = null;

        this.togglers.copy = new SectionToggler({
            container,
            sectionClass: 'export',
            titleText: TranslationManager.getText('exportDescriptions'),
            isExpanded,
            onToggle: (state) => {
                this.savePanelState('isCopySectionExpanded', state);
            },
            contentCreator: (content) => {
                // Create format selector container
                const formatSelectorContainer = document.createElement('div');
                formatSelectorContainer.className = 'format-selector-container';

                // Create format selector button
                const formatSelector = document.createElement('button');
                formatSelector.className = 'format-selector';
                formatSelector.textContent = TranslationManager.getText('selectFormat');

                // Create format dropdown
                const formatDropdown = document.createElement('div');
                formatDropdown.className = 'format-dropdown';

                // Toggle dropdown when selector is clicked
                formatSelector.addEventListener('click', () => {
                    formatDropdown.classList.toggle('active');
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (!formatSelectorContainer.contains(e.target)) {
                        formatDropdown.classList.remove('active');
                    }
                });

                formatSelectorContainer.appendChild(formatSelector);
                formatSelectorContainer.appendChild(formatDropdown);

                // Create format categories list
                const formatCategories = document.createElement('ul');
                formatCategories.className = 'format-categories';

                // Populate categories and formats
                Object.entries(this.exportFormats).forEach(([categoryId, category]) => {
                    const categoryItem = document.createElement('li');
                    categoryItem.className = 'format-category';

                    const categoryLabel = document.createElement('div');
                    categoryLabel.className = 'format-category-label';
                    categoryLabel.textContent = category.label;
                    categoryItem.appendChild(categoryLabel);

                    // Create format list for this category
                    const formatList = document.createElement('ul');
                    formatList.className = 'format-list';

                    // Create and add format items
                    Object.values(category.formats).forEach(format => {
                        // Create the format item element
                        const formatElement = format.createElement((selectedFormat) => {
                            // Unselect the previously selected format
                            if (window.currentSelectedFormat) {
                                window.currentSelectedFormat.unselect();
                            }

                            // Set the new selected format
                            window.currentSelectedFormat = selectedFormat;
                            selectedFormat.select();

                            // Update the selector button text
                            formatSelector.textContent = selectedFormat.label;

                            // Save the selected format
                            this.saveExportFormat(selectedFormat.id, selectedFormat.category);

                            // Close the dropdown
                            formatDropdown.classList.remove('active');
                        });

                        formatList.appendChild(formatElement);

                        // If this is the last selected format, select it
                        if (lastSelectedFormat &&
                            lastSelectedFormat.id === format.id &&
                            lastSelectedFormat.category === format.category) {
                            // Trigger a click on this format
                            setTimeout(() => {
                                const formatLabel = formatElement.querySelector('.format-label');
                                if (formatLabel) {
                                    formatLabel.click();
                                }
                            }, 0);
                        }
                    });

                    categoryItem.appendChild(formatList);
                    formatCategories.appendChild(categoryItem);
                });

                formatDropdown.appendChild(formatCategories);
                content.appendChild(formatSelectorContainer);

                // Create export button
                const exportButton = this.createButton(
                    TranslationManager.getText('exportData'),
                    'export-button',
                    () => this.exportData()
                );
                content.appendChild(exportButton);

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

    static saveExportFormat(formatId, categoryId) {
        try {
            localStorage.setItem('wallapop-export-format', JSON.stringify({id: formatId, category: categoryId}));
            Logger.log(`Export format saved: ${formatId} (${categoryId})`);
        } catch (error) {
            Logger.error(error, "Saving export format");
        }
    }

    static loadExportFormat() {
        try {
            const savedFormat = localStorage.getItem('wallapop-export-format');
            if (savedFormat) {
                const format = JSON.parse(savedFormat);
                Logger.log(`Export format loaded: ${format.id} (${format.category})`);
                return format;
            }
        } catch (error) {
            Logger.error(error, "Loading export format");
        }
        return null;
    }

    static exportData() {
        // Get the currently selected format
        const selectedFormat = window.currentSelectedFormat;
        if (!selectedFormat || DescriptionManager.expandedItems.length === 0) {
            // No format selected or no data to export
            return;
        }

        Logger.log(`Exporting data in ${selectedFormat.id} format with options:`, selectedFormat.getOptions());

        // Get the formatter based on the selected format
        const formatter = this.getFormatter(selectedFormat);
        if (!formatter) {
            Logger.log("No formatter available for", selectedFormat.id);
            return;
        }

        // Format the data
        const formattedData = formatter(DescriptionManager.expandedItems, selectedFormat.getOptions());

        // Copy to clipboard
        if (formattedData) {
            GM_setClipboard(formattedData);

            // Visual feedback
            const exportButton = document.querySelector('.export-button');
            if (exportButton) {
                this.showCopySuccess(exportButton, TranslationManager.getText('copied'));
            }
        }
    }

    static getFormatter(format) {
        // Map of format IDs to formatter functions
        const formatters = {
            // Text formats
            'plain': this.formatAsPlainText,
            'markdown': this.formatAsMarkdown,
            'html': this.formatAsHtml,

            // Data formats
            'json': this.formatAsJson,
            'csv': this.formatAsCsv,
            'tsv': this.formatAsTsv,
            'xml': this.formatAsXml,

            // Spreadsheet formats
            'excel-csv': this.formatAsExcelCsv,
            'excel-xml': this.formatAsExcelXml
        };

        return formatters[format.id];
    }

    static formatAsPlainText(items, options) {
        // Simple plain text formatter
        let result = '';

        items.forEach((item, index) => {
            result += `== ${item.title} ==\n`;
            result += `Price: ${item.price || 'N/A'}\n`;
            result += `Description: ${item.description}\n`;

            // Add images if option is enabled
            if (options['include-images'] && item.images && item.images.length > 0) {
                result += 'Images:\n';
                item.images.forEach(img => {
                    result += `- ${img}\n`;
                });
            }

            result += `URL: ${item.url}\n`;

            // Add separator between items
            if (index < items.length - 1) {
                result += '\n--------------------------------------------------\n\n';
            }
        });

        return result;
    }

    static formatAsMarkdown(items, options) {
        // Markdown formatter
        let result = '';

        items.forEach((item, index) => {
            // Add frontmatter if option is enabled
            if (options['use-frontmatter']) {
                result += '---\n';
                result += `title: "${item.title.replace(/"/g, '\\"')}"\n`;
                result += `price: "${item.price || 'N/A'}"\n`;
                result += `url: "${item.url}"\n`;

                if (options['include-images'] && item.images && item.images.length > 0) {
                    result += 'images:\n';
                    item.images.forEach(img => {
                        result += `  - ${img}\n`;
                    });
                }

                result += '---\n\n';
            }

            // Add title and details
            result += `# ${item.title}\n\n`;
            result += `**Price:** ${item.price || 'N/A'}\n\n`;
            result += `## Description\n\n${item.description}\n\n`;

            // Add images if option is enabled
            if (options['include-images'] && item.images && item.images.length > 0) {
                result += '## Images\n\n';
                item.images.forEach(img => {
                    result += `![${item.title}](${img})\n\n`;
                });
            }

            result += `**URL:** [${item.title}](${item.url})\n\n`;

            // Add separator between items
            if (index < items.length - 1) {
                result += '---\n\n';
            }
        });

        return result;
    }

    static formatAsJson(items, options) {
        // Filter out image URLs if not needed
        const processedItems = items.map(item => {
            const processedItem = {...item};

            // Remove images if option is disabled
            if (!options['include-images']) {
                delete processedItem.images;
            }

            return processedItem;
        });

        // Pretty print or compact JSON
        if (options['pretty-print']) {
            return JSON.stringify(processedItems, null, 2);
        } else {
            return JSON.stringify(processedItems);
        }
    }

    static formatAsCsv(items, options) {
        // Determine columns
        const columns = ['title', 'price', 'description', 'url'];

        // Add images column if needed
        if (options['include-images']) {
            columns.push('images');
        }

        // Start building CSV
        let csv = '';

        // Add headers if option is enabled
        if (options['include-headers']) {
            csv += columns.map(col => `"${col}"`).join(',') + '\n';
        }

        // Add data rows
        items.forEach(item => {
            const row = columns.map(column => {
                if (column === 'images') {
                    // Join multiple image URLs with pipe character if they exist
                    return item.images && item.images.length > 0
                        ? `"${item.images.join('|')}"`
                        : '""';
                } else {
                    // Escape double quotes and wrap values in quotes
                    const value = item[column] !== undefined ? String(item[column]) : '';
                    return `"${value.replace(/"/g, '""')}"`;
                }
            });

            csv += row.join(',') + '\n';
        });

        return csv;
    }

    static formatAsTsv(items, options) {
        // Determine columns
        const columns = ['title', 'price', 'description', 'url'];

        // Add images column if needed
        if (options['include-images']) {
            columns.push('images');
        }

        // Start building TSV
        let tsv = '';

        // Add headers if option is enabled
        if (options['include-headers']) {
            tsv += columns.join('\t') + '\n';
        }

        // Add data rows
        items.forEach(item => {
            const row = columns.map(column => {
                if (column === 'images') {
                    // Join multiple image URLs with pipe character if they exist
                    return item.images && item.images.length > 0
                        ? item.images.join('|')
                        : '';
                } else {
                    // Replace tabs with spaces for TSV compatibility
                    const value = item[column] !== undefined ? String(item[column]) : '';
                    return value.replace(/\t/g, ' ');
                }
            });

            tsv += row.join('\t') + '\n';
        });

        return tsv;
    }

    static formatAsHtml(items, options) {
        // HTML formatter
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wallapop Item Descriptions</title>`;

        // Add CSS if option is enabled
        if (options['include-styles']) {
            html += `
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        .item {
            margin-bottom: 40px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
        }
        .item:last-child {
            border-bottom: none;
        }
        .item-title {
            font-size: 24px;
            margin: 0 0 10px 0;
            color: #008080;
        }
        .item-price {
            font-size: 18px;
            font-weight: bold;
            color: #e64a19;
            margin: 0 0 15px 0;
        }
        .item-description {
            margin-bottom: 15px;
            white-space: pre-wrap;
        }
        .item-url {
            display: inline-block;
            margin-top: 10px;
            color: #0277bd;
            text-decoration: none;
        }
        .item-url:hover {
            text-decoration: underline;
        }
        .item-images {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 15px 0;
        }
        .item-image {
            max-width: 200px;
            max-height: 200px;
            object-fit: contain;
            border: 1px solid #ddd;
        }
        h2 {
            color: #555;
            font-size: 18px;
            margin: 20px 0 10px 0;
        }
    </style>`;
        }

        html += `
</head>
<body>
    <h1>Wallapop Item Descriptions</h1>`;

        // Add items
        items.forEach(item => {
            html += `
    <div class="item">
        <h2 class="item-title">${this.escapeHtml(item.title)}</h2>
        <div class="item-price">Price: ${this.escapeHtml(item.price || 'N/A')}</div>
        <div class="item-description">${this.escapeHtml(item.description)}</div>`;

            // Add images if option is enabled
            if (options['include-images'] && item.images && item.images.length > 0) {
                html += `
        <div class="item-images">`;

                item.images.forEach(img => {
                    html += `
            <img class="item-image" src="${this.escapeHtml(img)}" alt="${this.escapeHtml(item.title)}" />`;
                });

                html += `
        </div>`;
            }

            html += `
        <a class="item-url" href="${this.escapeHtml(item.url)}" target="_blank">View on Wallapop</a>
    </div>`;
        });

        html += `
</body>
</html>`;

        return html;
    }

    static formatAsXml(items, options) {
        // XML formatter
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<items>\n';

        // Add items
        items.forEach(item => {
            xml += '  <item>\n';
            xml += `    <title>${this.escapeXml(item.title)}</title>\n`;
            xml += `    <price>${this.escapeXml(item.price || 'N/A')}</price>\n`;
            xml += `    <description>${this.escapeXml(item.description)}</description>\n`;
            xml += `    <url>${this.escapeXml(item.url)}</url>\n`;

            // Add images if option is enabled
            if (options['include-images'] && item.images && item.images.length > 0) {
                xml += '    <images>\n';

                item.images.forEach(img => {
                    xml += `      <image>${this.escapeXml(img)}</image>\n`;
                });

                xml += '    </images>\n';
            }

            xml += '  </item>\n';
        });

        xml += '</items>';

        // Format XML with indentation if pretty print is enabled
        if (!options['pretty-print']) {
            // Remove line breaks and extra spaces if pretty print is disabled
            xml = xml.replace(/\n\s*/g, '');
        }

        return xml;
    }

    static formatAsExcelCsv(items, options) {
        // Excel-friendly CSV (uses semicolons as separators in some regions)
        // Determine columns
        const columns = ['title', 'price', 'description', 'url'];

        // Add images column if needed
        if (options['include-images']) {
            columns.push('images');
        }

        // Start building CSV
        let csv = '';

        // Add BOM for Excel
        const bom = '\uFEFF';
        csv += bom;

        // Add headers if option is enabled
        if (options['include-headers']) {
            csv += columns.map(col => `"${col}"`).join(';') + '\n';
        }

        // Add data rows
        items.forEach(item => {
            const row = columns.map(column => {
                if (column === 'images') {
                    // Join multiple image URLs with pipe character if they exist
                    return item.images && item.images.length > 0
                        ? `"${item.images.join('|')}"`
                        : '""';
                } else {
                    // Escape double quotes and wrap values in quotes
                    const value = item[column] !== undefined ? String(item[column]) : '';
                    return `"${value.replace(/"/g, '""')}"`;
                }
            });

            csv += row.join(';') + '\n';
        });

        return csv;
    }

    static formatAsExcelXml(items, options) {
        // Excel XML format
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<?mso-application progid="Excel.Sheet"?>\n';
        xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xml += '  xmlns:o="urn:schemas-microsoft-com:office:office"\n';
        xml += '  xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
        xml += '  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xml += '  xmlns:html="http://www.w3.org/TR/REC-html40">\n';
        xml += '  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">\n';
        xml += '    <Title>Wallapop Items Export</Title>\n';
        xml += '    <Author>Wallapop Expand Description</Author>\n';
        xml += '    <Created>' + new Date().toISOString() + '</Created>\n';
        xml += '  </DocumentProperties>\n';
        xml += '  <Styles>\n';
        xml += '    <Style ss:ID="Default" ss:Name="Normal">\n';
        xml += '      <Alignment ss:Vertical="Top"/>\n';
        xml += '      <Borders/>\n';
        xml += '      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11"/>\n';
        xml += '      <Interior/>\n';
        xml += '      <NumberFormat/>\n';
        xml += '      <Protection/>\n';
        xml += '    </Style>\n';
        xml += '    <Style ss:ID="Header">\n';
        xml += '      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>\n';
        xml += '      <Interior ss:Color="#C0C0C0" ss:Pattern="Solid"/>\n';
        xml += '    </Style>\n';
        xml += '  </Styles>\n';
        xml += '  <Worksheet ss:Name="Wallapop Items">\n';
        xml += '    <Table ss:ExpandedColumnCount="5" ss:ExpandedRowCount="' + (items.length + 1) + '" x:FullColumns="1" x:FullRows="1">\n';

        // Define columns
        const columns = ['title', 'price', 'description', 'url'];
        if (options['include-images']) {
            columns.push('images');
        }

        // Set column widths
        xml += '      <Column ss:Width="150"/>\n'; // Title
        xml += '      <Column ss:Width="80"/>\n';  // Price
        xml += '      <Column ss:Width="250"/>\n'; // Description
        xml += '      <Column ss:Width="150"/>\n'; // URL
        if (options['include-images']) {
            xml += '      <Column ss:Width="250"/>\n'; // Images
        }

        // Add headers if option is enabled
        if (options['include-headers']) {
            xml += '      <Row ss:StyleID="Header">\n';

            columns.forEach(column => {
                xml += '        <Cell><Data ss:Type="String">' + column + '</Data></Cell>\n';
            });

            xml += '      </Row>\n';
        }

        // Add data rows
        items.forEach(item => {
            xml += '      <Row>\n';

            columns.forEach(column => {
                let value = '';

                if (column === 'images') {
                    // Join multiple image URLs with pipe character if they exist
                    value = item.images && item.images.length > 0
                        ? item.images.join('|')
                        : '';
                } else {
                    value = item[column] !== undefined ? String(item[column]) : '';
                }

                xml += '        <Cell><Data ss:Type="String">' + this.escapeXml(value) + '</Data></Cell>\n';
            });

            xml += '      </Row>\n';
        });

        xml += '    </Table>\n';
        xml += '    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n';
        xml += '      <PageSetup>\n';
        xml += '        <Layout x:Orientation="Landscape"/>\n';
        xml += '        <Header x:Margin="0.3"/>\n';
        xml += '        <Footer x:Margin="0.3"/>\n';
        xml += '        <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>\n';
        xml += '      </PageSetup>\n';
        xml += '      <Print>\n';
        xml += '        <ValidPrinterInfo/>\n';
        xml += '        <HorizontalResolution>600</HorizontalResolution>\n';
        xml += '        <VerticalResolution>600</VerticalResolution>\n';
        xml += '      </Print>\n';
        xml += '      <Selected/>\n';
        xml += '      <Panes>\n';
        xml += '        <Pane>\n';
        xml += '          <Number>3</Number>\n';
        xml += '          <ActiveRow>1</ActiveRow>\n';
        xml += '          <ActiveCol>0</ActiveCol>\n';
        xml += '        </Pane>\n';
        xml += '      </Panes>\n';
        xml += '      <ProtectObjects>False</ProtectObjects>\n';
        xml += '      <ProtectScenarios>False</ProtectScenarios>\n';
        xml += '    </WorksheetOptions>\n';
        xml += '  </Worksheet>\n';
        xml += '</Workbook>';

        return xml;
    }

// Helper methods for HTML and XML escaping
    static escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    static escapeXml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
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