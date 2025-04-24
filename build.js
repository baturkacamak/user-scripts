const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const {rollup} = require('rollup');
const resolve = require('@rollup/plugin-node-resolve');
const metablock = require('rollup-plugin-userscript-metablock');

// Configuration
const CONFIG = {
    // Set to true for verbose mode, false for normal mode
    verbose: false, // Can be overridden with --verbose flag

    // Terminal styling symbols
    symbols: {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ',
        debug: '•',
        build: '🔨',
        watch: '👁',
        change: '📝',
        start: '🚀',
        core: '📦',
        time: '⏱',
    },

    // Colors for console output
    colors: {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        dim: '\x1b[2m',
        underscore: '\x1b[4m',
        blink: '\x1b[5m',
        reverse: '\x1b[7m',
        hidden: '\x1b[8m',

        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',

        bgBlack: '\x1b[40m',
        bgRed: '\x1b[41m',
        bgGreen: '\x1b[42m',
        bgYellow: '\x1b[43m',
        bgBlue: '\x1b[44m',
        bgMagenta: '\x1b[45m',
        bgCyan: '\x1b[46m',
        bgWhite: '\x1b[47m',
    },

    // Directories to exclude from building
    excludedDirs: ['node_modules', '.git', 'dist', '.github', '.idea'],
};

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const result = {
        watch: args.includes('--watch'),
        verbose: args.includes('--verbose'),
        dir: null,
    };

    const dirIndex = args.findIndex((arg) => '--dir' === arg);
    if (-1 !== dirIndex && args.length > dirIndex + 1) {
        result.dir = args[dirIndex + 1];
    }

    return result;
}

// Apply command line arguments to config
const args = parseArgs();
if (args.verbose) {
    CONFIG.verbose = true;
}

// Helper function for formatted logging
function log(message, type = 'info', forceShow = false) {
    // Skip debug logs in normal mode unless forced
    if ('debug' === type && !CONFIG.verbose && !forceShow) {
        return;
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
    const c = CONFIG.colors;
    const s = CONFIG.symbols;

    // Format based on message type
    switch (type) {
        case 'success':
            console.log(`${c.green}${c.bright}${s.success} SUCCESS${c.reset} ${c.dim}[${timestamp}]${c.reset} ${message}`);
            break;
        case 'error':
            console.log(`${c.red}${c.bright}${s.error} ERROR${c.reset} ${c.dim}[${timestamp}]${c.reset} ${message}`);
            break;
        case 'warning':
            console.log(`${c.yellow}${c.bright}${s.warning} WARNING${c.reset} ${c.dim}[${timestamp}]${c.reset} ${message}`);
            break;
        case 'info':
            console.log(`${c.blue}${s.info} INFO${c.reset} ${c.dim}[${timestamp}]${c.reset} ${message}`);
            break;
        case 'debug':
            console.log(`${c.magenta}${s.debug} DEBUG${c.reset} ${c.dim}[${timestamp}]${c.reset} ${message}`);
            break;
        case 'build':
            console.log(`${c.cyan}${s.build} BUILD${c.reset} ${c.dim}[${timestamp}]${c.reset} ${message}`);
            break;
        case 'watch':
            console.log(`${c.cyan}${s.watch} WATCH${c.reset} ${c.dim}[${timestamp}]${c.reset} ${message}`);
            break;
        case 'change':
            console.log(`${c.yellow}${s.change} CHANGE${c.reset} ${c.dim}[${timestamp}]${c.reset} ${message}`);
            break;
        case 'core':
            console.log(`${c.green}${s.core} CORE${c.reset} ${c.dim}[${timestamp}]${c.reset} ${message}`);
            break;
        case 'start':
            const border = '═'.repeat(message.length + 10);
            console.log(`\n${c.cyan}${border}${c.reset}`);
            console.log(`${c.cyan}${c.bright}    ${s.start} ${message}    ${c.reset}`);
            console.log(`${c.cyan}${border}${c.reset}\n`);
            break;
    }
}

// Print boxed section header
function printSectionHeader(title) {
    const c = CONFIG.colors;
    const padding = 4;
    const width = title.length + (padding * 2);

    const topBorder = `┌${'─'.repeat(width)}┐`;
    const bottomBorder = `└${'─'.repeat(width)}┘`;
    const titleLine = `│${' '.repeat(padding)}${title}${' '.repeat(padding)}│`;

    console.log(`\n${c.cyan}${topBorder}${c.reset}`);
    console.log(`${c.cyan}${titleLine}${c.reset}`);
    console.log(`${c.cyan}${bottomBorder}${c.reset}\n`);
}

// Check if a directory exists
function dirExists(dirPath) {
    try {
        return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch (error) {
        return false;
    }
}

// List all files in a directory recursively (debugging)
function listFilesInDir(dir, prefix = '') {
    if (!dirExists(dir)) {
        log(`Cannot list files: Directory '${dir}' does not exist or is not a directory`, 'error');
        return [];
    }

    try {
        let files = [];
        const items = fs.readdirSync(dir, {withFileTypes: true});

        items.forEach((item) => {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                if (!CONFIG.excludedDirs.includes(item.name)) {
                    files = files.concat(listFilesInDir(fullPath, `${prefix}${item.name}/`));
                }
            } else if (item.isFile() && item.name.endsWith('.js')) {
                files.push(`${prefix}${item.name}`);
            }
        });

        return files;
    } catch (error) {
        log(`Error listing files in ${dir}: ${error.message}`, 'error');
        return [];
    }
}

// Get all userscript directories
function getUserscriptDirectories() {
    log('Scanning for userscript directories...', 'debug');

    const dirs = fs.readdirSync('.', {withFileTypes: true})
        .filter((dirent) => dirent.isDirectory())
        .filter((dirent) => !CONFIG.excludedDirs.includes(dirent.name))
        .filter((dirent) => {
            const dirPath = dirent.name;

            // Check if this directory contains a userscript source file
            try {
                // First check if meta.json exists
                if (fs.existsSync(path.join(dirPath, 'meta.json'))) {
                    log(`Found meta.json in ${dirPath}`, 'debug');
                    // Now check for a .js file that's not a .user.js file
                    const files = fs.readdirSync(dirPath);
                    return files.some((file) => file.endsWith('.js') && !file.endsWith('.user.js'));
                }

                log(`No meta.json found in ${dirPath}, skipping`, 'debug');
                return false;
            } catch (error) {
                log(`Error reading directory ${dirPath}: ${error.message}`, 'error');
                return false;
            }
        })
        .map((dirent) => dirent.name);

    log(`Found ${dirs.length} valid userscript directories: ${dirs.join(', ')}`, 'debug');
    return dirs;
}

// Find all core files that userscripts depend on
function findWatchableCoreFiles() {
    // First, check if core directory exists
    if (!dirExists('./core')) {
        log('Core directory does not exist! Cannot watch core files.', 'error');
        return [];
    }

    // List all JavaScript files in the core directory
    log('Looking for JavaScript files in core directory...', 'debug');
    const coreJsFiles = [];

    function findJsFiles(dir) {
        try {
            const entries = fs.readdirSync(dir, {withFileTypes: true});

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    findJsFiles(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.js')) {
                    coreJsFiles.push(fullPath.replace(/\\/g, '/'));
                }
            }
        } catch (error) {
            log(`Error reading core directory: ${error.message}`, 'error');
        }
    }

    findJsFiles('./core');
    log(`Found ${coreJsFiles.length} JS files in core directory`, 'debug');

    return coreJsFiles;
}

// Build a single userscript
async function buildUserscript(dirName) {
    // Validate directory exists
    if (!fs.existsSync(dirName)) {
        log(`Directory not found: ${dirName}`, 'error');
        return false;
    }

    // Skip excluded directories
    if (CONFIG.excludedDirs.includes(dirName)) {
        log(`Skipping excluded directory: ${dirName}`, 'warning');
        return false;
    }

    // Check for meta.json
    const metaPath = path.join(dirName, 'meta.json');
    if (!fs.existsSync(metaPath)) {
        log(`No meta.json found in ${dirName}, cannot build userscript`, 'error');
        return false;
    }

    log(`Building userscript in directory: ${dirName}`, 'build');

    try {
        // Find the source file (main .js file that's not the .user.js file)
        const files = fs.readdirSync(dirName);
        const sourceFile = files.find((file) => file.endsWith('.js') && !file.endsWith('.user.js'));

        if (!sourceFile) {
            log(`No source file found in ${dirName}`, 'error');
            return false;
        }

        const sourcePath = path.join(dirName, sourceFile);
        const targetPath = path.join(dirName, `${path.basename(sourceFile, '.js')}.user.js`);

        log(`Source file: ${sourcePath}`, 'debug');
        log(`Target file: ${targetPath}`, 'debug');

        // Read meta.json to validate it before building
        const metaContent = fs.readFileSync(metaPath, 'utf8');
        try {
            JSON.parse(metaContent);
        } catch (e) {
            log(`Invalid meta.json in ${dirName}: ${e.message}`, 'error');
            return false;
        }

        log(`Using meta.json: ${metaPath}`, 'debug');
        const metaOptions = {
            file: metaPath,
        };

        // Create Rollup bundle
        log('Creating Rollup bundle...', 'debug');
        const bundle = await rollup({
            input: sourcePath,
            plugins: [
                resolve(),
                metablock(metaOptions),
            ],
        });

        log('Writing bundle output...', 'debug');
        await bundle.write({
            file: targetPath,
            format: 'iife',
            sourcemap: false,
        });

        log(`Successfully built ${dirName}/${path.basename(targetPath)}`, 'success');
        return true;
    } catch (error) {
        log(`Error building userscript in ${dirName}: ${error.message}`, 'error');
        if (CONFIG.verbose) {
            console.error(error);
        }
        return false;
    }
}

// Build all userscripts
async function buildAll() {
    const dirs = getUserscriptDirectories();

    if (0 === dirs.length) {
        log('No valid userscript directories found to build.', 'warning');
        return;
    }

    const c = CONFIG.colors;
    log(`Building ${dirs.length} userscript${1 !== dirs.length ? 's' : ''}...`, 'build');

    let successCount = 0;
    let failCount = 0;

    // Build one by one for better logging
    for (const dir of dirs) {
        const success = await buildUserscript(dir);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    if (0 === failCount) {
        printSectionHeader(`Build Complete: ${c.green}${successCount}/${dirs.length}${c.reset} userscripts built successfully`);
    } else {
        printSectionHeader(`Build Complete: ${c.green}${successCount}/${dirs.length}${c.reset} built, ${c.red}${failCount}${c.reset} failed`);
    }
}

// Create a map of file-to-target-directory for efficient rebuilding
function createRebuildMap() {
    const userscriptDirs = getUserscriptDirectories();
    const rebuildMap = {};

    // Check if core directory exists
    const hasCoreDir = dirExists('./core');

    if (hasCoreDir) {
        log('Core directory found, scanning for core files to watch...', 'debug');

        if (CONFIG.verbose) {
            // Debug: check the contents of the core directory
            log('Core directory structure:', 'debug');
            const coreFiles = listFilesInDir('./core');
            coreFiles.forEach((file) => {
                log(`  core/${file}`, 'debug');
            });
        }

        // Find all core JS files and add them to the rebuild map
        const coreJsFiles = findWatchableCoreFiles();

        coreJsFiles.forEach((filePath) => {
            log(`Adding core file to watch list: ${filePath}`, 'debug');
            rebuildMap[filePath] = [...userscriptDirs]; // All userscripts depend on core files
        });
    } else {
        log('Core directory does not exist! Skipping core file watching.', 'warning');
    }

    // Add userscript-specific files - they only trigger a rebuild of their own userscript
    userscriptDirs.forEach((dir) => {
        try {
            fs.readdirSync(dir, {withFileTypes: true})
                .filter((dirent) => !dirent.isDirectory() && dirent.name.endsWith('.js') && !dirent.name.endsWith('.user.js'))
                .forEach((dirent) => {
                    const filePath = path.join(dir, dirent.name).replace(/\\/g, '/');
                    log(`Adding userscript file to watch list: ${filePath}`, 'debug');
                    rebuildMap[filePath] = [dir];
                });
        } catch (error) {
            log(`Error reading directory ${dir}: ${error.message}`, 'error');
        }
    });

    return rebuildMap;
}

// Watch for changes
function watch() {
    const userscriptDirs = getUserscriptDirectories();

    if (0 === userscriptDirs.length) {
        log('No valid userscript directories found to watch.', 'warning');
        return;
    }

    log('Setting up watch mode...', 'watch');

    // Create a specific mapping of watched files to the targets they'll rebuild
    const rebuildMap = createRebuildMap();

    // Create a list of files to watch
    const watchFiles = Object.keys(rebuildMap);

    if (0 === watchFiles.length) {
        log('No files found to watch. Make sure core directory exists and userscripts are valid.', 'error');
        return;
    }

    const c = CONFIG.colors;

    // Print watch info
    printSectionHeader(`Watching ${c.yellow}${watchFiles.length}${c.reset} files for ${c.green}${userscriptDirs.length}${c.reset} userscripts`);

    // In verbose mode, show what files will trigger what rebuilds
    if (CONFIG.verbose) {
        log('Watched files that will trigger rebuilds:', 'debug');
        Object.entries(rebuildMap).forEach(([file, targets]) => {
            log(`  ${file} → will rebuild: ${targets.join(', ')}`, 'debug');
        });
    } else {
        // In normal mode, just show count of core/userscript files
        const coreFiles = watchFiles.filter((file) => file.startsWith('core/')).length;
        const userscriptFiles = watchFiles.length - coreFiles;
        log(`Watching ${c.green}${coreFiles}${c.reset} core files and ${c.yellow}${userscriptFiles}${c.reset} userscript files`, 'watch');
    }

    // Also watch meta.json files
    const metaFiles = userscriptDirs.map((dir) => path.join(dir, 'meta.json'));

    // Initialize watcher
    log('Starting file watcher...', 'debug');

    // Debug: verify all files exist before watching
    if (CONFIG.verbose) {
        watchFiles.forEach((file) => {
            if (!fs.existsSync(file)) {
                log(`Warning: Watch file does not exist: ${file}`, 'warning');
            }
        });
    }

    // Initialize watcher with proper configuration
    const watcher = chokidar.watch([...watchFiles, ...metaFiles], {
        ignored: [
            '**/*.user.js', // Don't watch output files
            '**/node_modules/**', // Ignore node_modules
            '**/.git/**', // Ignore git files
        ],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: { // Important for editors that do atomic saves
            stabilityThreshold: 300,
            pollInterval: 100,
        },
        usePolling: true, // Use polling for more reliable detection
        interval: 500, // Lower interval for faster detection
        binaryInterval: 1000,
        alwaysStat: CONFIG.verbose, // Get full stats about files in verbose mode
    });

    // Track build timestamps to prevent duplicate builds
    const lastBuilds = {};

    // File change handler
    const changeHandler = async (filepath, stats) => {
        // Get normalized path for comparison
        const normalizedPath = filepath.replace(/\\/g, '/');

        const now = Date.now();

        // For meta.json changes, rebuild the parent directory
        if (normalizedPath.endsWith('meta.json')) {
            const dir = path.dirname(normalizedPath);

            // Avoid rebuilding too frequently
            if (lastBuilds[dir] && 500 > now - lastBuilds[dir]) {
                log(`Skipping rebuild of ${dir} - built too recently`, 'debug');
                return;
            }

            lastBuilds[dir] = now;

            log(`Meta file ${c.cyan}${path.basename(normalizedPath)}${c.reset} changed in ${c.yellow}${dir}${c.reset}`, 'change');
            await buildUserscript(dir);
            return;
        }

        // Find targets to rebuild
        const targetsToRebuild = rebuildMap[normalizedPath] || [];

        if (0 === targetsToRebuild.length) {
            log(`Changed file ${normalizedPath} doesn't map to any userscript, skipping`, 'debug');
            return;
        }

        // Is this a core file? (affects all userscripts)
        const isCore = normalizedPath.startsWith('core/');

        if (isCore) {
            log(`Core file changed: ${c.green}${normalizedPath}${c.reset}`, 'core');

            if (CONFIG.verbose && stats) {
                log(`File stats: size=${stats.size}, mtime=${stats.mtime}`, 'debug');
                try {
                    const content = fs.readFileSync(normalizedPath, 'utf8').substring(0, 100);
                    log(`File content (first 100 chars): ${content.replace(/\n/g, ' ')}...`, 'debug');
                } catch (error) {
                    log(`Error reading file: ${error.message}`, 'debug');
                }
            }

            // In normal mode, show a summary of affected userscripts
            if (!CONFIG.verbose) {
                log(`Rebuilding ${c.yellow}${targetsToRebuild.length}${c.reset} userscripts due to core change`, 'build');
            }

            // Rebuild each target, one at a time
            for (const target of targetsToRebuild) {
                // Avoid rebuilding too frequently
                if (lastBuilds[target] && 500 > now - lastBuilds[target]) {
                    log(`Skipping rebuild of ${target} - built too recently`, 'debug');
                    continue;
                }

                lastBuilds[target] = now;

                if (CONFIG.verbose) {
                    log(`Rebuilding ${c.yellow}${target}${c.reset} due to core change`, 'build');
                }
                await buildUserscript(target);
            }
        } else {
            // For userscript-specific files, just rebuild that one
            const target = targetsToRebuild[0];

            // Avoid rebuilding too frequently
            if (lastBuilds[target] && 500 > now - lastBuilds[target]) {
                log(`Skipping rebuild of ${target} - built too recently`, 'debug');
                return;
            }

            lastBuilds[target] = now;

            log(`Userscript file changed: ${c.cyan}${path.basename(normalizedPath)}${c.reset}`, 'change');
            await buildUserscript(target);
        }
    };

    // Set up event handlers
    watcher
        .on('change', changeHandler)
        .on('add', (path) => {
            if (CONFIG.verbose) {
                log(`File added to watch list: ${path}`, 'debug');
            }
        })
        .on('unlink', (path) => {
            log(`File removed: ${path}`, 'debug');
            // Consider rebuilding if a file is removed
            changeHandler(path);
        })
        .on('ready', () => {
            log('Initial scan complete, ready for changes', 'watch');
            log(`${c.green}${CONFIG.symbols.success} Watching for changes...${c.reset} (Press Ctrl+C to stop)`, 'info', true);
        })
        .on('error', (error) => log(`Watcher error: ${error}`, 'error'));

    // Set up a periodic check in verbose mode only
    if (CONFIG.verbose) {
        setInterval(() => {
            log('Watch mode is still active...', 'debug');

            // Check for physical changes to verify file system monitoring
            const testFile = './core/utils/Logger.js';
            if (fs.existsSync(testFile)) {
                try {
                    const stats = fs.statSync(testFile);
                    log(`Logger.js stats: size=${stats.size}, mtime=${stats.mtime}`, 'debug');
                } catch (error) {
                    log(`Error checking test file: ${error.message}`, 'debug');
                }
            }
        }, 60000);
    }
}

// Main function
async function main() {
    // Display script start header with verbosity mode
    log(CONFIG.verbose ? 'Build Script Started (VERBOSE MODE)' : 'Build Script Started', 'start');

    // Run initial build
    if (args.dir) {
        if (CONFIG.excludedDirs.includes(args.dir)) {
            log(`Cannot build excluded directory: ${args.dir}`, 'error');
        } else {
            log(`Building specific directory: ${args.dir}`, 'build');
            await buildUserscript(args.dir);
        }
    } else {
        await buildAll();
    }

    // Start watch mode if requested
    if (args.watch) {
        watch();
    }
}

// Run the script
main().catch((error) => {
    log(`Unhandled error: ${error.message}`, 'error');
    if (CONFIG.verbose) {
        console.error(error);
    }
    process.exit(1);
});
