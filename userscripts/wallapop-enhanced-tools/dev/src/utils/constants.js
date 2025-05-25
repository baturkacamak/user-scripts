// Constants used throughout the application

export const SELECTORS = {
    ITEM_CARDS: [
        'a.ItemCardList__item[href^="https://es.wallapop.com/item/"]',
        '[class^="experimentator-layout-slider_ExperimentatorSliderLayout__item"] a[href^="/item/"]',
        '[class^="feed_Feed__item__"] a[href^="/item/"]',
    ],
    ITEM_DESCRIPTION: '[class^="item-detail_ItemDetail__description__"]',
    EXPAND_BUTTON: '.expand-button',
    // Control panel selectors
    CONTROL_PANEL: '.control-panel',
    FILTER_INPUT: '.filter-input',
    FILTER_APPLY: '.filter-apply',
    BLOCKED_TERMS_LIST: '.blocked-terms-list'
};

// Export format categories
export const EXPORT_FORMAT_CATEGORIES = {
    // Text-based formats
    text: {
        label: 'Text',
        formats: ['plain', 'markdown', 'html']
    },
    // Data formats
    data: {
        label: 'Data',
        formats: ['json', 'csv', 'tsv', 'xml']
    },
    // Spreadsheet formats
    spreadsheet: {
        label: 'Spreadsheet',
        formats: ['excel-csv', 'excel-xml']
    }
};

// Local storage keys
export const STORAGE_KEYS = {
    BLOCKED_TERMS: 'wallapop-blocked-terms',
    PANEL_STATES: 'wallapop-panel-states',
    LANGUAGE: 'wallapop-language',
    EXPORT_FORMAT: 'wallapop-export-format'
};