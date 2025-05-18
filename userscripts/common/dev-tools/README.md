# Universal Development Script Loader

This userscript is a development tool that automatically loads the appropriate local development script based on the
current website you're visiting. It streamlines the development workflow for userscripts in this repository.

## Features

- Automatically detects which website you're on and loads the corresponding development script
- Uses cache busting to ensure you're always testing the latest version
- Provides a fallback method if direct script loading fails due to CORS issues
- Easy to configure for new userscripts

## Installation

1. Install a userscript manager like [Tampermonkey](https://tampermonkey.net/)
   or [Greasemonkey](https://www.greasespot.net/)
2. Create a new userscript and paste the contents of `dev-script-loader.user.js`
3. Save and enable the script

## Usage

1. Start your local development server:
   ```bash
   npm start
   ```
   This will start a server at http://localhost:3000.

2. Visit a supported website (e.g., Wallapop, Loom)
3. The loader will automatically detect the site and load the appropriate development version of your userscript
4. Make changes to your script in the development file (e.g., `wallapop-enhanced-tools.js`)
5. Refresh the site to see the changes immediately

## Configuration

The script is configured to work with the following sites:

- wallapop.com → Loads the Wallapop Enhanced Tools script
- loom.com → Loads the Loom Captions Extractor script

### Adding Support for New Scripts

To add support for a new userscript, edit the `scriptConfigs` array:

```javascript
const scriptConfigs = [
    // Existing configurations...
    {
        name: "Your New Script",
        matches: ["example.com", "example.org"],  // Domains where this script should load
        path: "your-script-directory/your-script.user.js"  // Path to the script in your repo
    }
];
```

Then add the appropriate `@match` rule to the userscript header to ensure it runs on the new domain.

### Changing the Development Server

If you need to change the development server configuration (e.g., using a different port), modify the `devServer`
object:

```javascript
const devServer = {
    protocol: "http",
    host: "localhost",
    port: 8080  // Changed from default 3000
};
```

## Development Workflow

This tool enables a more efficient development workflow:

1. Make changes to your script in the development file
2. The build system automatically compiles your changes:
   ```bash
   npm run watch
   ```
3. Refresh the website to immediately see your changes
4. No need to reinstall the userscript after each change

## Troubleshooting

- **Script not loading**: Check your browser's console for error messages from the loader
- **CORS errors**: The loader will automatically try a fallback method, but you may need to configure your server to
  send appropriate CORS headers
- **Wrong script loading**: Make sure your domain matches one of the patterns in the `scriptConfigs` array

## License

MIT License - See the repository's LICENSE file for details