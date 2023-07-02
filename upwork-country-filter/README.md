# [Upwork Country Filter](https://github.com/your-username/userscripts/tree/master/upwork-country-filter)

## Description

This script is a user script for Upwork that filters job listings by country. It removes jobs from specified countries, allowing users to customize their job search experience on Upwork.

## How it Works

The script uses a MutationObserver to detect changes in the DOM and remove job listings from specific countries. It maintains a list of countries to be filtered, and any job listing with a matching country will be removed from the page.

## Installation

To use this script, you need a user script manager extension installed in your browser. Here are some popular user script managers:

- [Tampermonkey](https://www.tampermonkey.net/) (for Chrome, Microsoft Edge, Safari, Opera Next, and Firefox)
- [Greasemonkey](https://www.greasespot.net/) (for Firefox)

Once you have a user script manager installed, you can install the Upwork Country Filter script by following these steps:

1. Go to the [raw script file](https://github.com/baturkacamak/userscripts/raw/master/upwork-country-filter/upwork-country-filter.user.js).
2. The user script manager should recognize the script and prompt you to install it. Click "Install" or "Add" to proceed.

## Usage

After installing the script, visit the Upwork website ([www.upwork.com](https://www.upwork.com)) and navigate to the job search or browse page. The script will automatically filter job listings based on the specified countries. Any job listings from the filtered countries will be removed from the page.

## Customization

If you want to customize the list of filtered countries, you can modify the `COUNTRIES` array in the script. Simply add or remove country names as needed. For example:

```javascript
static COUNTRIES = ['India', 'Bangladesh', 'Pakistan', 'Arab', 'Country5'];
```

Save the modified script and refresh the Upwork page for the changes to take effect.

## Compatibility

This script is compatible with modern web browsers that support user script managers like Tampermonkey or Greasemonkey. It has been tested on popular browsers such as Chrome, Firefox, and Safari.

Please note that Upwork may update its website, which could potentially affect the script's functionality. In such cases, the script may need to be updated to accommodate any changes made by Upwork.

## Contributions

Contributions to the Upwork Country Filter script are welcome. If you have any suggestions, improvements, or bug fixes, feel free to open an issue or submit a pull request on the [GitHub repository](https://github.com/your-username/userscripts/tree/master/upwork-country-filter).