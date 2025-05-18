import SidebarPanel from '../../../common/core/ui/SidebarPanel.js';
import Button from '../../../common/core/ui/Button.js';
import Checkbox from '../../../common/core/ui/Checkbox.js';
import PubSub from '../../../common/core/utils/PubSub.js';
import {UpworkCountryFilter} from '../components/CountryFilter.js';
// import StyleManager from '../../../core/utils/StyleManager.js'; // If custom styles are needed

const SETTINGS_PANEL_ID = 'upwork-country-filter-settings-panel';
const BANNED_LIST_ID = 'upwork-banned-countries-list';
const ADD_COUNTRY_INPUT_ID = 'upwork-add-country-input';

export class SettingsPanel {
    static sidebarPanel = null;
    static filterEnabledCheckbox = null;
    static countriesListContainer = null;
    static addCountryInput = null;

    static currentBannedCountries = [];
    static currentFilterEnabled = true;

    static init() {
        const initialSettings = UpworkCountryFilter.getSettings();
        this.currentFilterEnabled = initialSettings.isEnabled;
        this.currentBannedCountries = [...initialSettings.countries];

        this.sidebarPanel = new SidebarPanel(SETTINGS_PANEL_ID, 'Upwork Country Filter Settings');

        this.buildPanelContent();

        PubSub.subscribe('filterSettingsRefreshed', (settings) => {
            this.currentFilterEnabled = settings.isEnabled;
            this.currentBannedCountries = [...settings.countries];
            this.refreshUiElements();
        });
    }

    static buildPanelContent() {
        const contentDiv = document.createElement('div');
        contentDiv.style.padding = '10px';

        // Filter Enabled/Disabled Checkbox
        this.filterEnabledCheckbox = new Checkbox(
            'Enable Country Filter',
            this.currentFilterEnabled,
            (isChecked) => {
                PubSub.publish('filterEnabledChanged', isChecked);
            }
        );
        contentDiv.appendChild(this.filterEnabledCheckbox.getElement());

        // Separator
        const separator = document.createElement('hr');
        separator.style.margin = '10px 0';
        contentDiv.appendChild(separator);

        // Banned Countries List Heading
        const listHeading = document.createElement('h4');
        listHeading.textContent = 'Banned Countries:';
        listHeading.style.marginTop = '0';
        listHeading.style.marginBottom = '5px';
        contentDiv.appendChild(listHeading);

        // Countries List Container
        this.countriesListContainer = document.createElement('div');
        this.countriesListContainer.id = BANNED_LIST_ID;
        this.countriesListContainer.style.marginBottom = '10px';
        contentDiv.appendChild(this.countriesListContainer);
        this.renderBannedCountriesList();

        // Add Country Input and Button
        this.addCountryInput = document.createElement('input');
        this.addCountryInput.type = 'text';
        this.addCountryInput.id = ADD_COUNTRY_INPUT_ID;
        this.addCountryInput.placeholder = 'Enter country name';
        this.addCountryInput.style.marginRight = '5px';
        this.addCountryInput.style.padding = '5px';
        this.addCountryInput.style.border = '1px solid #ccc';
        this.addCountryInput.style.borderRadius = '3px';

        const addButton = new Button('Add Country', () => {
            const countryName = this.addCountryInput.value.trim();
            if (countryName && !this.currentBannedCountries.map(c => c.toLowerCase()).includes(countryName.toLowerCase())) {
                this.currentBannedCountries.push(countryName);
                PubSub.publish('bannedCountriesChanged', [...this.currentBannedCountries]);
                this.addCountryInput.value = ''; // Clear input
                // The list will re-render once CountryFilter confirms via 'filterSettingsRefreshed'
            }
        });
        addButton.getElement().style.padding = '5px 10px';

        const addControlsDiv = document.createElement('div');
        addControlsDiv.appendChild(this.addCountryInput);
        addControlsDiv.appendChild(addButton.getElement());
        contentDiv.appendChild(addControlsDiv);

        this.sidebarPanel.setContent(contentDiv);
    }

    static renderBannedCountriesList() {
        if (!this.countriesListContainer) return;
        this.countriesListContainer.innerHTML = ''; // Clear existing list

        if (this.currentBannedCountries.length === 0) {
            const noCountriesMsg = document.createElement('p');
            noCountriesMsg.textContent = 'No countries are currently banned.';
            noCountriesMsg.style.fontStyle = 'italic';
            this.countriesListContainer.appendChild(noCountriesMsg);
            return;
        }

        const ul = document.createElement('ul');
        ul.style.listStyleType = 'none';
        ul.style.paddingLeft = '0';
        ul.style.maxHeight = '150px';
        ul.style.overflowY = 'auto';
        ul.style.border = '1px solid #eee';
        ul.style.padding = '5px';

        this.currentBannedCountries.forEach(country => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.padding = '3px 0';

            const countryText = document.createElement('span');
            countryText.textContent = country;

            const removeButton = new Button('Remove', () => {
                this.currentBannedCountries = this.currentBannedCountries.filter(c => c !== country);
                PubSub.publish('bannedCountriesChanged', [...this.currentBannedCountries]);
            });
            removeButton.getElement().style.padding = '2px 5px';
            removeButton.getElement().style.fontSize = '0.8em';
            removeButton.getElement().style.marginLeft = '10px';

            li.appendChild(countryText);
            li.appendChild(removeButton.getElement());
            ul.appendChild(li);
        });
        this.countriesListContainer.appendChild(ul);
    }

    static refreshUiElements() {
        if (this.filterEnabledCheckbox) {
            this.filterEnabledCheckbox.setChecked(this.currentFilterEnabled);
        }
        this.renderBannedCountriesList();
    }
} 