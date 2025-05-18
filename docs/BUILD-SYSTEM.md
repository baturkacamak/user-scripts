# Build System Documentation

This document provides a comprehensive guide to the build system used for the Wallapop Enhanced Tools userscript and
other userscripts in this repository.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Core Components](#core-components)
- [Build System Components](#build-system-components)
- [Building Userscripts](#building-userscripts)
- [Watch Mode](#watch-mode)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Overview

The build system is designed to:

1. Compile modular JavaScript code into single userscript files
2. Automatically inject metadata from JSON configuration
3. Support a shared core library across multiple userscripts
4. Provide a development environment with hot reloading

The system uses [Rollup](https://rollupjs.org/) for bundling, along with custom Node.js scripts for orchestrating the
build process.

## Directory Structure

```
ProjectRoot/
├── userscripts/                  # All individual userscript projects
│   ├── core/                     # Shared core components (utils, UI, i18n)
│   │   ├── i18n/
│   │   ├── ui/
│   │   └── utils/
│   └── wallapop-enhanced-tools/  # Example userscript directory
│       ├── meta.json             # Userscript metadata
│       ├── wallapop-enhanced-tools.js # Source code
│       └── wallapop-enhanced-tools.user.js # Compiled output (generated)
│   # ... other userscript directories ...
├── config/                     # Build and configuration files
│   ├── build.js                # Main build script
│   ├── rollup.config.js        # Rollup configuration factory
│   ├── create_new_userscript.sh # Script to generate new userscripts
│   └── _userscript-template/   # Template for new userscripts
├── docs/                       # Documentation files
│   └── BUILD-SYSTEM.md
├── .git/                       # Git repository files
├── node_modules/               # NPM dependencies
├── .gitignore
├── package.json                # NPM dependencies and scripts
├── package-lock.json
├── README.md                   # Main project README
└── server.js                   # Local development server (serves from root)
```

## Core Components

The `core/` directory contains shared components that can be imported by any userscript:

### Utils

- **GMFunctions.js**: Provides fallbacks for Greasemonkey/Tampermonkey functions
- **HTMLUtils.js**: Utilities for HTML manipulation
- **Logger.js**: Logging utility with debug levels
- **StyleManager.js**: CSS style management

### UI Components

- **Button.js**: Reusable button component
- **DOMObserver.js**: Watches for DOM changes
- **SelectBox.js**: Dropdown select component
- **Slider.js**: Range input component
- **SectionToggler.js**: Collapsible section component
- **ProgressBar.js**: Progress indicator component

### Internationalization

- **TranslationManager.js**: Multi-language support system

## Build System Components

### build.js

The main build script for handling userscript compilation. Features include:

- Building individual or all userscripts
- Watching files for changes
- Colored console output
- Verbose debugging mode

### rollup.config.js

Configures Rollup for bundling userscripts. It:

- Resolves dependencies with `@rollup/plugin-node-resolve`
- Injects metadata headers with `rollup-plugin-userscript-metablock`
- Outputs IIFE format for userscript compatibility

### server.js

A simple Express server for local development:

```javascript
const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
```

## Building Userscripts

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# For yarn users
yarn
```

### Build Commands

```bash
# Build all userscripts
npm run build

# Build a specific userscript (e.g., wallapop-enhanced-tools)
npm run build:wallapop

# Start watch mode for all userscripts
npm run watch

# Watch with verbose logging
npm run watch:verbose

# Run the development server
npm start
```

### NPM Scripts

The following scripts are defined in `package.json` (refer to actual `package.json` for the most current list):

```json
"scripts": {
  "start": "node server.js",
  "build": "node config/build.js",
  "watch": "node config/build.js --watch",
  "watch:verbose": "node config/build.js --watch --verbose",
  "build:wallapop": "node config/build.js --dir userscripts/wallapop-enhanced-tools" 
  // ... other specific build scripts ...
}
```

## Watch Mode

Watch mode automatically rebuilds userscripts when source files change. It:

1. Creates a mapping of which files affect which userscripts
2. Watches both core files and individual userscript files
3. Rebuilds the appropriate userscripts when changes are detected
4. Avoids duplicate builds with a debounce mechanism

### Command Line Arguments

- `--watch`: Enable watch mode
- `--verbose`: Enable verbose logging
- `--dir [directory]`: Build a specific userscript directory

Example:

```bash
node config/build.js --watch --verbose --dir userscripts/wallapop-enhanced-tools
```

## Configuration

### Userscript Metadata

Each userscript requires a `meta.json` file in its directory with metadata:

```json
{
  "name": "Wallapop Enhanced Tools",
  "namespace": "https://github.com/baturkacamak/userscripts",
  "version": "1.5.0",
  "description": "Comprehensive Wallapop enhancement suite",
  "author": "Batur Kacamak",
  "match": [
    "https://*.wallapop.com/*"
  ],
  "grant": [
    "GM_addStyle",
    "GM_xmlhttpRequest",
    "GM_setClipboard",
    "GM_download"
  ]
}
```

### Build System Configuration

In `build.js`, the `CONFIG` object defines build system behavior:

```javascript
const CONFIG = {
    verbose: false,
    symbols: { /* console symbols */},
    colors: { /* console colors */},
    excludedDirs: ['node_modules', '.git', 'dist', '.github', '.idea']
};
```

### Command Line Arguments for `build.js` (Direct Usage)

If running `build.js` directly (not via npm scripts):

-   `--watch`: Enable watch mode.
-   `--verbose`: Enable verbose logging.
-   `--dir [directory_path]`: Build or watch a specific userscript directory. The path should be relative to the project root (e.g., `userscripts/my-cool-script`).

Example of direct execution:

```bash
node config/build.js --dir userscripts/your-userscript-name
```

## Troubleshooting

### Common Issues

1. **Missing metadata**: Ensure each userscript directory has a valid `meta.json` file.

2. **Module not found errors**: Check import paths. Remember that paths are relative to the importing file.

3. **Watch mode not detecting changes**:
    - Try using polling: `--watch` already enables polling
    - Check if the changed file is in `excludedDirs`
    - Some editors use atomic saves which can sometimes be missed

4. **GM functions not working**:
    - Ensure proper grants in `meta.json`
    - Check browser console for errors
    - Verify userscript manager permissions

### Debugging

For detailed debugging information, use verbose mode:

```bash
npm run watch:verbose
```

This will show:

- File scanning details
- Core file detection
- Watched files and their rebuild targets
- File change events
- Build process details

## Creating a New Userscript

1. Create a new directory with your userscript name
2. Add a `meta.json` file with required metadata
3. Create a main JavaScript file with the same name as the directory
4. Import core components as needed:

```javascript
import {Button, Logger, StyleManager, TranslationManager} from "../core";
```

5. Build your userscript with:

```bash
node config/build.js --dir your-userscript-name
```

---

## License

The build system and core components are licensed under the MIT License.

See [LICENSE](https://github.com/baturkacamak/user-scripts/blob/master/wallapop-enhanced-tools/LICENSE) for more
information.