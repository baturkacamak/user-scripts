import { UpworkCountryFilter } from './src/components/CountryFilter.js';
import { SettingsPanel } from './src/ui/SettingsPanel.js';

async function main() {
    // Initialize the core filter logic first to load settings
    await UpworkCountryFilter.init();

    // Then initialize the UI panel, which will use the loaded settings
    SettingsPanel.init();
}

main().catch(error => {
    console.error('Error initializing Upwork Country Filter:', error);
}); 