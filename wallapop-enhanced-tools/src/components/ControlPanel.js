// Control panel component with all tool controls

import {Logger} from "../../core";
import {TranslationManager} from "../../core";
import {Button, Checkbox, SectionToggler, Slider, SelectBox, ProgressBar} from "../../core";
import {DescriptionManager} from "../managers/DescriptionManager";
import {FilterManager} from "../managers/FilterManager";
import {FormatterService} from "../services/FormatterService";
import {FormatOption} from "./FormatOption";
import {SidebarPanel} from "./SidebarPanel";
import {SELECTORS, STORAGE_KEYS} from "../utils/constants";
import {
    loadFromLocalStorage,
    saveToLocalStorage,
    loadPanelState,
    savePanelState,
    showButtonSuccess,
    downloadFile,
    getFileInfo
} from "../utils/helpers";

/**
 * Main control panel component that contains all tools
 */
export class ControlPanel {
    static container = null;
    static sidebarPanel = null;
    static filterInputElement = null;
    static blockedTermsListElement = null;
    static expandProgressContainer = null;
    static progressBar = null;
    static delaySlider = null;
    static hideReservedCheckbox = null;
    static reservedStatusElement = null;
    static formatSelector = null;

    // Store section togglers for state management
    static togglers = {
        panel: null,
        filter: null,
        expandAll: null,
        deliveryMethod: null,
        reservedListings: null,
        copy: null,
        language: null
    };

    /**
     * Create the main control panel
     */
    static createControlPanel() {
        // Initialize the sidebar panel
        this.sidebarPanel = new SidebarPanel({
            id: 'wallapop-tools-panel',
            title: TranslationManager.getText('wallapopTools'),
            position: 'right',
            transition: 'slide',
            buttonIcon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
            namespace: 'wallapop-enhanced',
            rememberState: true,
            content: {
                generator: () => {
                    // Create content container
                    const contentContainer = document.createElement('div');
                    this.container = contentContainer;

                    // Create sections
                    this.createExpandAllSection(contentContainer);
                    this.createFilterSection(contentContainer);
                    this.createDeliveryMethodSection(contentContainer);
                    this.createReservedListingsSection(contentContainer);
                    this.createCopySection(contentContainer);
                    this.createLanguageSection(contentContainer);

                    return contentContainer;
                }
            },
            style: {
                width: '320px',
                buttonBg: '#008080', // Wallapop teal
                buttonBgHover: '#006666',
                panelBg: '#ffffff',
            },
            onOpen: () => {
                // Additional actions when panel opens
                this.updateUILanguage();
                this.loadBlockedTerms();
                this.updateReservedStatusCount();
            }
        });

        // Load initial state
        this.updateUILanguage();
        this.loadBlockedTerms();

        Logger.debug("Sidebar panel created for Wallapop Tools");
    }

    /**
     * Create the expand all section
     * @param {HTMLElement} container - The container to add the section to
     * @returns {HTMLElement} The created section element
     */
    static createExpandAllSection(container) {
        // Load saved state
        const isExpanded = loadPanelState('isExpandAllSectionExpanded', true);

        this.togglers.expandAll = new SectionToggler({
            container,
            customClassName: 'expand-all',
            title: TranslationManager.getText('expandAllDescriptions'),
            isExpanded,
            onToggle: (state) => {
                savePanelState('isExpandAllSectionExpanded', state);
            },
            contentCreator: (content) => {
                // Create the expand all button
                const expandAllButton = this.createButton(
                    TranslationManager.getText('expandAllVisible'),
                    'panel-button expand-all-button',
                    () => this.handleExpandAll()
                );
                content.appendChild(expandAllButton);

                // Create progress container (empty container to hold the progress bar)
                const progressContainer = document.createElement('div');
                progressContainer.className = 'expand-progress-container';
                progressContainer.style.display = 'none';
                progressContainer.style.marginTop = '10px';

                // Store the container for later access
                this.expandProgressContainer = progressContainer;
                content.appendChild(progressContainer);

                // Add delay option using the Slider component
                const delayContainer = document.createElement('div');
                delayContainer.style.marginTop = '10px';

                // Get saved delay value
                const savedDelay = parseInt(loadPanelState('expandAllDelay', '1000'));

                // Create the slider with the Slider component
                this.delaySlider = new Slider({
                    container: delayContainer,
                    min: 500,
                    max: 3000,
                    step: 100,
                    value: savedDelay,
                    label: TranslationManager.getText('delayBetweenRequests'),
                    theme: 'primary',
                    valueSuffix: 'ms',
                    onChange: (value) => {
                        savePanelState('expandAllDelay', value.toString());
                    }
                });

                content.appendChild(delayContainer);
            }
        });

        return this.togglers.expandAll.section;
    }

    /**
     * Create the filter section
     * @param {HTMLElement} container - The container to add the section to
     * @returns {HTMLElement} The created section element
     */
    static createFilterSection(container) {
        // Load saved state
        const isExpanded = loadPanelState('isFilterSectionExpanded', true);

        this.togglers.filter = new SectionToggler({
            container,
            sectionClass: 'filter',
            title: TranslationManager.getText('filterUnwantedWords'),
            isExpanded,
            onToggle: (state) => {
                savePanelState('isFilterSectionExpanded', state);
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
     * Create the delivery method section
     * @param {HTMLElement} container - The container to add the section to
     * @returns {HTMLElement} The created section element
     */
    static createDeliveryMethodSection(container) {
        // Load saved state
        const isExpanded = loadPanelState('isDeliveryMethodSectionExpanded', true);

        this.togglers.deliveryMethod = new SectionToggler({
            container,
            sectionClass: 'delivery-method',
            title: TranslationManager.getText('deliveryMethodFilter'),
            isExpanded,
            onToggle: (state) => {
                savePanelState('isDeliveryMethodSectionExpanded', state);
            },
            contentCreator: (content) => {
                // Create select element with SelectBox component
                new SelectBox({
                    items: [
                        {
                            value: 'all',
                            label: TranslationManager.getText('showAll'),
                            selected: loadPanelState('deliveryMethodFilter', 'all') === 'all'
                        },
                        {
                            value: 'shipping',
                            label: TranslationManager.getText('showOnlyShipping'),
                            selected: loadPanelState('deliveryMethodFilter', 'all') === 'shipping'
                        },
                        {
                            value: 'inperson',
                            label: TranslationManager.getText('showOnlyInPerson'),
                            selected: loadPanelState('deliveryMethodFilter', 'all') === 'inperson'
                        }
                    ],
                    name: 'delivery-method',
                    id: 'delivery-method-select',
                    container: content,
                    onChange: (value) => {
                        savePanelState('deliveryMethodFilter', value);
                        FilterManager.applyDeliveryMethodFilter();
                    },
                    theme: 'default',
                    size: 'medium'
                });
            }
        });

        return this.togglers.deliveryMethod.section;
    }

    /**
     * Create the reserved listings section
     * @param {HTMLElement} container - The container to add the section to
     * @returns {HTMLElement} The created section element
     */
    static createReservedListingsSection(container) {
        // Load saved state
        const isExpanded = loadPanelState('isReservedListingsSectionExpanded', true);
        const hideReserved = loadPanelState('hideReservedListings', true); // Default to true - hide reserved listings

        this.togglers.reservedListings = new SectionToggler({
            container,
            sectionClass: 'reserved-listings',
            title: TranslationManager.getText('reservedListingsFilter'),
            isExpanded,
            onToggle: (state) => {
                savePanelState('isReservedListingsSectionExpanded', state);
            },
            contentCreator: (content) => {
                // Create a checkbox control using the Checkbox component
                const hideReservedContainer = document.createElement('div');
                hideReservedContainer.style.padding = '10px 0';

                // Create checkbox using the Checkbox component
                this.hideReservedCheckbox = new Checkbox({
                    label: TranslationManager.getText('hideReservedListings'),
                    checked: hideReserved,
                    container: hideReservedContainer,
                    onChange: (e) => {
                        const isChecked = e.target.checked;
                        savePanelState('hideReservedListings', isChecked);
                        FilterManager.applyReservedFilter();
                        this.updateReservedStatusCount();
                    }
                });

                content.appendChild(hideReservedContainer);

                // Add status text element to show count of hidden listings
                const statusElement = document.createElement('div');
                statusElement.className = 'reserved-status';
                statusElement.style.fontSize = '12px';
                statusElement.style.color = '#666';
                statusElement.style.fontStyle = 'italic';
                statusElement.style.padding = '5px 0';
                content.appendChild(statusElement);

                // Store reference for later updates
                this.reservedStatusElement = statusElement;
            }
        });

        return this.togglers.reservedListings.section;
    }

    /**
     * Create the copy/export section
     * @param {HTMLElement} container - The container to add the section to
     * @returns {HTMLElement} The created section element
     */
    static createCopySection(container) {
        // Load saved state
        const isExpanded = loadPanelState('isCopySectionExpanded', true);

        // Load the last selected format
        let lastSelectedFormat = this.loadExportFormat();

        this.togglers.copy = new SectionToggler({
            container,
            sectionClass: 'export',
            title: TranslationManager.getText('exportDescriptions'),
            isExpanded,
            onToggle: (state) => {
                savePanelState('isCopySectionExpanded', state);
            },
            contentCreator: (content) => {
                // Get export formats from the service
                const exportFormats = FormatterService.getExportFormats();

                // Convert export formats to SelectBox items format
                const selectItems = [];

                // Process each category
                Object.entries(exportFormats).forEach(([categoryId, category]) => {
                    // Create a category item with nested formats
                    const categoryItems = {
                        label: category.label,
                        items: []
                    };

                    // Add formats to this category
                    Object.entries(category.formats).forEach(([formatId, format]) => {
                        categoryItems.items.push({
                            value: `${categoryId}:${formatId}`,
                            label: format.label,
                            // Select this format if it matches last saved format
                            selected: lastSelectedFormat &&
                                lastSelectedFormat.category === categoryId &&
                                lastSelectedFormat.id === formatId
                        });
                    });

                    selectItems.push(categoryItems);
                });

                // Create format selector using SelectBox
                const formatSelectorContainer = document.createElement('div');
                formatSelectorContainer.className = 'format-selector-container';
                content.appendChild(formatSelectorContainer);

                // Initialize SelectBox
                this.formatSelector = new SelectBox({
                    items: selectItems,
                    name: 'export-format',
                    id: 'export-format-select',
                    placeholder: TranslationManager.getText('selectFormat'),
                    container: formatSelectorContainer,
                    theme: 'default',
                    size: 'medium',
                    useCategorizedUI: true,
                    onChange: (value) => {
                        // Parse the value (category:formatId)
                        const [categoryId, formatId] = value.split(':');

                        // Save the selected format
                        this.saveExportFormat(formatId, categoryId);

                        // Store current selected format for use in export functions
                        window.currentSelectedFormat = exportFormats[categoryId].formats[formatId];
                    }
                });

                const formatOptionsContainer = document.createElement('div');
                formatOptionsContainer.className = 'format-options-container';
                formatOptionsContainer.style.display = 'none'; // Hide initially
                content.appendChild(formatOptionsContainer);

                // Update when format changes
                this.formatSelector.onChange = (value) => {
                    // Parse the value (category:formatId)
                    const [categoryId, formatId] = value.split(':');

                    // Save the selected format
                    this.saveExportFormat(formatId, categoryId);

                    // Get the format
                    const format = exportFormats[categoryId].formats[formatId];
                    window.currentSelectedFormat = format;

                    // Update options display
                    this.updateFormatOptions(format, formatOptionsContainer);
                };

                // Create export buttons container
                const exportButtonsContainer = document.createElement('div');
                exportButtonsContainer.className = 'export-buttons-container';

                // Copy button
                const copyButton = this.createButton(
                    TranslationManager.getText('copyToClipboard'),
                    'export-button',
                    () => this.copyToClipboard()
                );
                copyButton.style.flex = '1';

                // Download button
                const downloadButton = this.createButton(
                    TranslationManager.getText('downloadFile'),
                    'export-button',
                    () => this.downloadFormatted()
                );
                downloadButton.style.flex = '1';

                exportButtonsContainer.appendChild(copyButton);
                exportButtonsContainer.appendChild(downloadButton);
                content.appendChild(exportButtonsContainer);

                content.insertBefore(formatOptionsContainer, exportButtonsContainer);

                const handleFormatSelection = (value) => {
                    // Parse the value (category:formatId)
                    const [categoryId, formatId] = value.split(':');

                    // Save the selected format
                    this.saveExportFormat(formatId, categoryId);

                    // Get the format
                    const format = exportFormats[categoryId].formats[formatId];
                    window.currentSelectedFormat = format;

                    // Update options display
                    this.updateFormatOptions(format, formatOptionsContainer);
                };

                if (lastSelectedFormat) {
                    // Get currently selected value from select box
                    const selectedValue = this.formatSelector.getValue();
                    if (selectedValue) {
                        handleFormatSelection(selectedValue);
                    }
                }

                // Create clear button
                const clearButton = this.createButton(
                    TranslationManager.getText('clearAll'),
                    'panel-button copy-clear',
                    () => {
                        DescriptionManager.clearItems();
                        showButtonSuccess(clearButton, TranslationManager.getText('cleared'));
                    }
                );
                content.appendChild(clearButton);
            }
        });

        return this.togglers.copy.section;
    }

    /**
     * Create the language section
     * @param {HTMLElement} container - The container to add the section to
     * @returns {HTMLElement} The created section element
     */
    static createLanguageSection(container) {
        // Load saved state
        const isExpanded = loadPanelState('isLanguageSectionExpanded', true);

        this.togglers.language = new SectionToggler({
            container,
            sectionClass: 'language',
            title: TranslationManager.getText('languageSettings'),
            isExpanded,
            onToggle: (state) => {
                savePanelState('isLanguageSectionExpanded', state);
            },
            contentCreator: (content) => {
                // Create language selector
                const languageSelector = document.createElement('div');
                languageSelector.className = 'language-selector';

                // Add language options using Button component
                Object.entries(TranslationManager.availableLanguages).forEach(([code, name]) => {
                    const isActive = code === TranslationManager.currentLanguage;

                    // Use Button component with CSS class for styling
                    const langButton = this.createButton(
                        name,
                        `lang-button ${isActive ? 'active' : ''}`,
                        () => {
                            if (TranslationManager.setLanguage(code)) {
                                // Update all language buttons' active state
                                document.querySelectorAll('.lang-button').forEach(btn => {
                                    const btnCode = btn.dataset.lang;
                                    if (btnCode === code) {
                                        btn.classList.add('active');
                                    } else {
                                        btn.classList.remove('active');
                                    }
                                });

                                // Update all text in the UI
                                this.updateUILanguage();
                                return true;
                            }
                            return false;
                        },
                        {
                            container: languageSelector,
                            preserveStyles: true // Use our custom option to preserve CSS classes
                        }
                    );

                    // Add dataset attribute for language code
                    langButton.dataset.lang = code;
                });

                content.appendChild(languageSelector);
            }
        });

        return this.togglers.language.section;
    }

    /**
     * Create a button with standard style
     * @param {string} text - Button text
     * @param {string} className - CSS class
     * @param {Function} clickHandler - Click event handler
     * @param {Object} options - Additional options
     * @returns {HTMLElement} The created button
     */
    static createButton(text, className, clickHandler, options = {}) {
        // Configure button options
        const buttonOptions = {
            text: text,
            className: className, // Use the original class name
            onClick: clickHandler,
            disabled: options.disabled || false,
            successText: options.successText || null,
            successDuration: options.successDuration || 1500,
            container: options.container || null
        };

        // Create button using Button component
        const buttonComponent = new Button(buttonOptions);
        const buttonElement = buttonComponent.button;

        // Add any dataset properties
        if (options.dataset) {
            Object.entries(options.dataset).forEach(([key, value]) => {
                buttonElement.dataset[key] = value;
            });
        }

        return buttonElement;
    }

    /**
     * Add a blocked term from the input field
     */
    static addBlockedTerm() {
        const term = this.filterInputElement.value.trim();

        if (term && FilterManager.addBlockedTerm(term)) {
            this.updateBlockedTermsList();
            this.filterInputElement.value = '';

            // Re-apply filters to all listings
            FilterManager.applyFilters();
        }
    }

    /**
     * Remove a blocked term
     * @param {string} term - The term to remove
     */
    static removeBlockedTerm(term) {
        if (FilterManager.removeBlockedTerm(term)) {
            this.updateBlockedTermsList();

            // Re-apply filters to all listings
            FilterManager.applyFilters();
        }
    }

    /**
     * Update the list of blocked terms in the UI
     */
    static updateBlockedTermsList() {
        if (this.blockedTermsListElement) {
            this.blockedTermsListElement.innerHTML = '';

            const blockedTerms = FilterManager.getBlockedTerms();
            if (blockedTerms.length === 0) {
                this.renderNoBlockedTermsMessage();
            } else {
                this.renderBlockedTermsList(blockedTerms);
            }
        }
    }

    /**
     * Render message when no terms are blocked
     */
    static renderNoBlockedTermsMessage() {
        const emptyMessage = document.createElement('div');
        emptyMessage.textContent = TranslationManager.getText('noWordsToFilter');
        emptyMessage.style.fontStyle = 'italic';
        emptyMessage.style.color = '#888';
        emptyMessage.style.padding = '8px 0';
        emptyMessage.style.opacity = '0';
        this.blockedTermsListElement.appendChild(emptyMessage);

        // Fade in animation
        setTimeout(() => {
            emptyMessage.style.transition = 'opacity 0.3s ease-in-out';
            emptyMessage.style.opacity = '1';
        }, 10);
    }

    /**
     * Render the list of blocked terms
     * @param {Array<string>} blockedTerms - Array of blocked terms
     */
    static renderBlockedTermsList(blockedTerms) {
        blockedTerms.forEach((term, index) => {
            const termItem = document.createElement('div');
            termItem.className = 'blocked-term-item';
            termItem.style.opacity = '0';
            termItem.style.transform = 'translateY(-10px)';

            const termText = document.createElement('span');
            termText.textContent = term;
            termItem.appendChild(termText);

            const removeButton = document.createElement('button');
            removeButton.className = 'remove-term';
            removeButton.textContent = '×';
            removeButton.title = TranslationManager.getText('remove');
            removeButton.addEventListener('click', () => {
                termItem.classList.add('fadeOutAnimation');
                setTimeout(() => this.removeBlockedTerm(term), 300);
            });
            termItem.appendChild(removeButton);

            this.blockedTermsListElement.appendChild(termItem);

            // Staggered fade in animation
            setTimeout(() => {
                termItem.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
                termItem.style.opacity = '1';
                termItem.style.transform = 'translateY(0)';
            }, 50 * index);
        });
    }

    /**
     * Update format options display based on the selected format
     * @param {Object} format - The selected format
     * @param {HTMLElement} container - The container for options
     */
    static updateFormatOptions(format, container) {
        // Clear existing options
        container.innerHTML = '';

        // If no options, hide the container
        if (!format.options || format.options.length === 0) {
            container.style.display = 'none';
            return;
        }

        // Show the container
        container.style.display = 'block';

        // Create a label
        const optionsLabel = document.createElement('div');
        optionsLabel.className = 'format-options-label';
        optionsLabel.textContent = 'Format Options:';
        container.appendChild(optionsLabel);

        // Create options using Checkbox component
        format.options.forEach(option => {
            const optionRow = document.createElement('div');
            optionRow.className = 'option-row';

            // Create checkbox using the Checkbox component
            new Checkbox({
                id: `option-${format.id}-${option.id}`,
                label: option.label,
                checked: option.defaultValue || false,
                container: optionRow,
                size: 'small',
                attributes: {
                    title: option.description || ''
                },
                onChange: (e) => {
                    format.setOption(option.id, e.target.checked);
                }
            });

            container.appendChild(optionRow);
        });
    }

    /**
     * Handle expanding all visible descriptions
     */
    static async handleExpandAll() {
        // Find all unexpanded descriptions that are visible (not filtered)
        const allExpandButtons = Array.from(document.querySelectorAll(SELECTORS.EXPAND_BUTTON))
            .filter(button => {
                // Only include buttons that are for expanding (not hiding)
                const isExpandButton = button.textContent === TranslationManager.getText('expandDescription');
                // Only include buttons for listings that are visible (not filtered out)
                const listing = this.getListingFromButton(button);
                const isVisible = listing && !listing.classList.contains('hidden-item');

                return isExpandButton && isVisible;
            });

        const totalButtons = allExpandButtons.length;

        if (totalButtons === 0) {
            this.showExpandAllMessage(TranslationManager.getText('noDescriptionsToExpand'));
            return;
        }

        // Get the delay setting from the slider
        const delay = this.delaySlider ? this.delaySlider.getValue() : parseInt(loadPanelState('expandAllDelay', '1000'));

        // Get expand button and disable it
        const expandAllButton = document.querySelector('.expand-all-button');
        if (expandAllButton) expandAllButton.disabled = true;

        // Show the progress container and create a new ProgressBar instance
        if (this.expandProgressContainer) {
            this.expandProgressContainer.innerHTML = '';
            this.expandProgressContainer.style.display = 'block';

            // Create the progress bar using the enhanced ProgressBar component
            this.progressBar = new ProgressBar({
                initialValue: 0,
                container: this.expandProgressContainer,
                showText: true,
                theme: 'primary',
                size: 'normal'
            });

            // Set initial text
            this.progressBar.setValue(0, `Expanding 0 of ${totalButtons}`);
        }

        let expanded = 0;
        let errors = 0;

        // Process buttons one at a time
        for (const button of allExpandButtons) {
            try {
                // Update progress bar with current status
                if (this.progressBar) {
                    // Calculate percentage
                    const progress = Math.floor((expanded / totalButtons) * 100);

                    // Update progress bar with custom text
                    this.progressBar.setValue(
                        progress,
                        `Expanding ${expanded + 1} of ${totalButtons}`
                    );
                }

                // Click the button to expand
                button.click();

                // Wait for the specified delay
                await new Promise(resolve => setTimeout(resolve, delay));

                expanded++;
            } catch (error) {
                Logger.error(error, "Expanding description in sequence");
                errors++;
            }
        }

        // Update UI when finished
        if (this.progressBar) {
            // Set to 100% complete
            this.progressBar.setValue(100);

            // Change theme based on success or errors
            this.progressBar.setTheme(errors > 0 ? 'warning' : 'success');

            // Update the text with completion message
            const completionText = TranslationManager.getText('expandingComplete', {
                count: expanded,
                total: totalButtons,
                errors: errors
            });
            this.progressBar.setValue(100, completionText);
        }

        // Re-enable the button after 2 seconds
        setTimeout(() => {
            if (expandAllButton) expandAllButton.disabled = false;

            // Hide progress after 5 seconds
            setTimeout(() => {
                if (this.expandProgressContainer) {
                    this.expandProgressContainer.style.display = 'none';

                    // Clean up the progress bar instance
                    if (this.progressBar) {
                        this.progressBar.destroy();
                        this.progressBar = null;
                    }
                }
            }, 3000);
        }, 2000);
    }

    /**
     * Get the listing element that contains the button
     * @param {HTMLElement} button - The button element
     * @returns {HTMLElement|null} The listing container element or null
     */
    static getListingFromButton(button) {
        // Traverse up to find the listing container
        let element = button;

        // Check SELECTORS.ITEM_CARDS selectors to find which one matches
        for (let i = 0; i < 10; i++) {  // Limit to 10 levels to avoid infinite loop
            element = element.parentElement;

            if (!element) break;

            const matchesSelector = SELECTORS.ITEM_CARDS.some(selector => {
                // Remove the prefix if it's a child selector
                const simpleSelector = selector.includes(' ')
                    ? selector.split(' ').pop()
                    : selector;

                return element.matches(simpleSelector);
            });

            if (matchesSelector) return element;
        }

        return null;
    }

    /**
     * Show a message in the expand all section
     * @param {string} message - The message to show
     */
    static showExpandAllMessage(message) {
        const expandAllButton = document.querySelector('.expand-all-button');
        if (expandAllButton) {
            const originalText = expandAllButton.textContent;
            expandAllButton.textContent = message;

            setTimeout(() => {
                expandAllButton.textContent = originalText;
            }, 2000);
        }
    }

    /**
     * Update panel visibility based on whether there are expanded descriptions
     */
    static updatePanelVisibility() {
        const copySection = document.querySelector('.userscripts-section.export');
        if (copySection) {
            copySection.style.display =
                DescriptionManager.expandedItems.length > 0 ? 'block' : 'none';
        }
    }

    /**
     * Update the count of hidden reserved listings
     */
    static updateReservedStatusCount() {
        if (!this.reservedStatusElement) return;

        // Only count if the filter is active
        if (!loadPanelState('hideReservedListings', true)) {
            this.reservedStatusElement.textContent = '';
            return;
        }

        // Count listings with the reserved-hidden dataset flag
        const count = document.querySelectorAll('[data-reserved-hidden="true"]').length;

        this.reservedStatusElement.textContent = TranslationManager.getText(
            'reservedListingsFound', {count: count}
        );
    }

    /**
     * Load blocked terms from localStorage
     */
    static loadBlockedTerms() {
        const blockedTerms = FilterManager.getBlockedTerms();
        this.updateBlockedTermsList();
        Logger.debug("Blocked terms loaded:", blockedTerms);
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

        // Update section titles
        if (this.togglers.expandAll) {
            this.togglers.expandAll.setTitle(TranslationManager.getText('expandAllDescriptions'));
        }

        if (this.togglers.filter) {
            this.togglers.filter.setTitle(TranslationManager.getText('filterUnwantedWords'));
        }

        if (this.togglers.deliveryMethod) {
            this.togglers.deliveryMethod.setTitle(TranslationManager.getText('deliveryMethodFilter'));
        }

        if (this.togglers.reservedListings) {
            this.togglers.reservedListings.setTitle(TranslationManager.getText('reservedListingsFilter'));
        }

        if (this.togglers.copy) {
            this.togglers.copy.setTitle(TranslationManager.getText('exportDescriptions'));
        }

        if (this.togglers.language) {
            this.togglers.language.setTitle(TranslationManager.getText('languageSettings'));
        }

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

        // Update expand all button
        updateText('.expand-all-button', 'expandAllVisible');

        // Update copy section buttons
        updateText('.export-buttons-container .export-button:first-child', 'copyToClipboard');
        updateText('.export-buttons-container .export-button:last-child', 'downloadFile');
        updateText('.copy-clear', 'clearAll');

        // Update delivery method select if it exists
        const deliveryMethodSelect = this.container.querySelector('#delivery-method-select');
        if (deliveryMethodSelect && deliveryMethodSelect._selectBoxInstance) {
            deliveryMethodSelect._selectBoxInstance.updateItems([
                {
                    value: 'all',
                    label: TranslationManager.getText('showAll'),
                    selected: loadPanelState('deliveryMethodFilter', 'all') === 'all'
                },
                {
                    value: 'shipping',
                    label: TranslationManager.getText('showOnlyShipping'),
                    selected: loadPanelState('deliveryMethodFilter', 'all') === 'shipping'
                },
                {
                    value: 'inperson',
                    label: TranslationManager.getText('showOnlyInPerson'),
                    selected: loadPanelState('deliveryMethodFilter', 'all') === 'inperson'
                }
            ]);
        }

        // Update reserved listing checkbox
        if (this.hideReservedCheckbox) {
            this.hideReservedCheckbox.setLabel(TranslationManager.getText('hideReservedListings'));
        }

        // Update status element
        this.updateReservedStatusCount();

        // Update slider label if it exists
        if (this.delaySlider) {
            this.delaySlider.setLabel(TranslationManager.getText('delayBetweenRequests'));
        }

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

        // Update SidebarPanel title if available
        if (this.sidebarPanel) {
            this.sidebarPanel.setTitle(TranslationManager.getText('wallapopTools'));
        }
    }

    /**
     * Copy formatted data to clipboard
     */
    static copyToClipboard() {
        // Get the currently selected format
        const selectedFormat = window.currentSelectedFormat;
        if (!selectedFormat || DescriptionManager.expandedItems.length === 0) {
            // No format selected or no data to export
            return;
        }

        Logger.debug(`Copying data in ${selectedFormat.id} format with options:`, selectedFormat.getOptions());

        // Format the data
        const formattedData = FormatterService.formatData(selectedFormat.id, selectedFormat.getOptions());

        // Copy to clipboard
        if (formattedData) {
            GM_setClipboard(formattedData);

            // Visual feedback
            const copyButton = document.querySelector('.export-buttons-container .export-button:first-child');
            if (copyButton) {
                showButtonSuccess(copyButton, TranslationManager.getText('copied'));
            }
        }
    }

    /**
     * Download formatted data as a file
     */
    static downloadFormatted() {
        // Get the currently selected format
        const selectedFormat = window.currentSelectedFormat;
        if (!selectedFormat || DescriptionManager.expandedItems.length === 0) {
            // No format selected or no data to export
            return;
        }

        Logger.debug(`Downloading data in ${selectedFormat.id} format with options:`, selectedFormat.getOptions());

        // Format the data
        const formattedData = FormatterService.formatData(selectedFormat.id, selectedFormat.getOptions());

        if (formattedData) {
            // Get file extension and mime type
            const {extension, mimeType} = getFileInfo(selectedFormat.id);

            // Create filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const filename = `wallapop-export-${timestamp}.${extension}`;

            // Download the file
            downloadFile(formattedData, filename, mimeType);

            // Visual feedback
            const downloadButton = document.querySelector('.export-buttons-container .export-button:last-child');
            if (downloadButton) {
                showButtonSuccess(downloadButton, TranslationManager.getText('downloaded'));
            }
        }
    }

    /**
     * Save the selected export format
     * @param {string} formatId - Format ID
     * @param {string} categoryId - Category ID
     */
    static saveExportFormat(formatId, categoryId) {
        try {
            localStorage.setItem(STORAGE_KEYS.EXPORT_FORMAT, JSON.stringify({id: formatId, category: categoryId}));
            Logger.debug(`Export format saved: ${formatId} (${categoryId})`);
        } catch (error) {
            Logger.error(error, "Saving export format");
        }
    }

    /**
     * Load the previously saved export format
     * @returns {Object|null} The saved format or null
     */
    static loadExportFormat() {
        try {
            const savedFormat = localStorage.getItem(STORAGE_KEYS.EXPORT_FORMAT);
            if (savedFormat) {
                const format = JSON.parse(savedFormat);
                Logger.debug(`Export format loaded: ${format.id} (${format.category})`);
                return format;
            }
        } catch (error) {
            Logger.error(error, "Loading export format");
        }
        return null;
    }
}