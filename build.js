const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const {rollup} = require('rollup');
const resolve = require('@rollup/plugin-node-resolve');
const metablock = require('rollup-plugin-userscript-metablock');

// Debug mode flag - change to false to reduce verbosity
const DEBUG = true;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Directories to exclude from building
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', '.github', '.idea'];

// Helper function for formatted logging
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);

  switch (type) {
    case 'info':
      console.log(`${colors.bright}${colors.blue}[${timestamp}] INFO:${colors.reset} ${message}`);
      break;
    case 'success':
      console.log(`${colors.bright}${colors.green}[${timestamp}] SUCCESS:${colors.reset} ${message}`);
      break;
    case 'warning':
      console.log(`${colors.bright}${colors.yellow}[${timestamp}] WARNING:${colors.reset} ${message}`);
      break;
    case 'error':
      console.log(`${colors.bright}${colors.red}[${timestamp}] ERROR:${colors.reset} ${message}`);
      break;
    case 'debug':
      if (DEBUG) {
        console.log(`${colors.bright}${colors.magenta}[${timestamp}] DEBUG:${colors.reset} ${message}`);
      }
      break;
  }
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
        if (!EXCLUDED_DIRS.includes(item.name)) {
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

// Check if user is passing build directory explicitly
function parseUserscriptDir(args) {
  const dirIndex = args.findIndex((arg) => '--dir' === arg);
  if (-1 !== dirIndex && args.length > dirIndex + 1) {
    return args[dirIndex + 1];
  }
  return null;
}

// Get all userscript directories
function getUserscriptDirectories() {
  log('Scanning for userscript directories...', 'debug');

  const dirs = fs.readdirSync('.', {withFileTypes: true})
      .filter((dirent) => dirent.isDirectory())
      .filter((dirent) => !EXCLUDED_DIRS.includes(dirent.name))
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

// Analyze imports in a file to find core dependencies
function analyzeImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const importRegex = /import\s+.*from\s+['"](.+?)['"]/g;
    const imports = [];

    let match;
    while (null !== (match = importRegex.exec(content))) {
      imports.push(match[1]);
    }

    return imports;
  } catch (error) {
    log(`Error analyzing imports in ${filePath}: ${error.message}`, 'error');
    return [];
  }
}

// Build a single userscript
async function buildUserscript(dirName) {
  // Validate directory exists
  if (!fs.existsSync(dirName)) {
    log(`Directory not found: ${dirName}`, 'error');
    return false;
  }

  // Skip excluded directories
  if (EXCLUDED_DIRS.includes(dirName)) {
    log(`Skipping excluded directory: ${dirName}`, 'warning');
    return false;
  }

  // Check for meta.json
  const metaPath = path.join(dirName, 'meta.json');
  if (!fs.existsSync(metaPath)) {
    log(`No meta.json found in ${dirName}, cannot build userscript`, 'error');
    return false;
  }

  log(`Building userscript in directory: ${dirName}`, 'info');

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
      override: {
        name: path.basename(dirName),
      },
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

    log(`Successfully built ${targetPath}`, 'success');
    return true;
  } catch (error) {
    log(`Error building userscript in ${dirName}: ${error.message}`, 'error');
    console.error(error);
    return false;
  }
}

// Build all userscripts
async function buildAll() {
  const dirs = getUserscriptDirectories();
  log(`Building ${dirs.length} userscripts...`, 'info');

  const results = await Promise.all(dirs.map((dir) => buildUserscript(dir)));
  const successCount = results.filter(Boolean).length;

  log(`Build complete: ${successCount}/${dirs.length} userscripts built successfully`,
        successCount === dirs.length ? 'success' : 'warning');
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

// Create a map of file-to-target-directory for efficient rebuilding
function createRebuildMap() {
  const userscriptDirs = getUserscriptDirectories();
  const rebuildMap = {};

  // Check if core directory exists
  const hasCoreDir = dirExists('./core');

  if (hasCoreDir) {
    log('Core directory exists, scanning for core files to watch...', 'debug');

    // Debug: check the contents of the core directory
    log('Core directory structure:', 'debug');
    const coreFiles = listFilesInDir('./core');
    coreFiles.forEach((file) => {
      log(`  core/${file}`, 'debug');
    });

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

  log('Starting watch setup...', 'debug');

  // Create a specific mapping of watched files to the targets they'll rebuild
  const rebuildMap = createRebuildMap();

  // Create a list of files to watch
  const watchFiles = Object.keys(rebuildMap);

  log(`Starting watch mode for ${watchFiles.length} files...`, 'info');
  log(`Watching changes for userscripts: ${userscriptDirs.join(', ')}`, 'info');

  // Debug output of the watch setup
  log('Watched files that will trigger rebuilds:', 'debug');
  Object.entries(rebuildMap).forEach(([file, targets]) => {
    log(`  ${file} → will rebuild: ${targets.join(', ')}`, 'debug');
  });

  // Also watch meta.json files
  const metaFiles = userscriptDirs.map((dir) => path.join(dir, 'meta.json'));

  // Initialize watcher with debug logging
  log('Creating file watcher with the following configuration:', 'debug');
  log(`  Files to watch: ${watchFiles.length} JS files + ${metaFiles.length} meta.json files`, 'debug');
  log('  Using polling: yes (for reliability)', 'debug');
  log('  Poll interval: 500ms', 'debug');
  log('  Ignored patterns: **/*.user.js, **/node_modules/**, **/.git/**', 'debug');

  // Debug: verify all files exist before watching
  watchFiles.forEach((file) => {
    if (!fs.existsSync(file)) {
      log(`Warning: Watch file does not exist: ${file}`, 'warning');
    }
  });

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
    alwaysStat: true, // Get full stats about files
  });

  // Track build timestamps to prevent duplicate builds
  const lastBuilds = {};

  // File change handler
  const changeHandler = async (filepath, stats) => {
    // Get normalized path for comparison
    const normalizedPath = filepath.replace(/\\/g, '/');
    log(`Change detected: ${normalizedPath}`, 'info');

    if (stats) {
      log(`  File stats: size=${stats.size}, mtime=${stats.mtime}`, 'debug');
    }

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

      log(`Meta file changed in ${dir}, rebuilding userscript`, 'info');
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
      log(`Core file changed: ${normalizedPath}`, 'info');
      log('File content check (first 100 chars):', 'debug');
      try {
        const content = fs.readFileSync(normalizedPath, 'utf8').substring(0, 100);
        log(`  ${content.replace(/\n/g, ' ')}...`, 'debug');
      } catch (error) {
        log(`  Error reading file: ${error.message}`, 'debug');
      }

      log(`Rebuilding all affected userscripts (${targetsToRebuild.length})`, 'info');

      // Rebuild each target, one at a time
      for (const target of targetsToRebuild) {
        // Avoid rebuilding too frequently
        if (lastBuilds[target] && 500 > now - lastBuilds[target]) {
          log(`Skipping rebuild of ${target} - built too recently`, 'debug');
          continue;
        }

        lastBuilds[target] = now;

        log(`Rebuilding ${target} due to core change`, 'info');
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

      log(`Userscript file changed in ${target}`, 'info');
      await buildUserscript(target);
    }
  };

  // Set up event handlers
  watcher
      .on('change', changeHandler)
      .on('add', (path) => log(`File added to watch list: ${path}`, 'debug'))
      .on('unlink', (path) => {
        log(`File removed: ${path}`, 'debug');
        // Consider rebuilding if a file is removed
        changeHandler(path);
      })
      .on('ready', () => log('Initial scan complete, ready for changes', 'info'))
      .on('error', (error) => log(`Watcher error: ${error}`, 'error'));

  log('Watching for changes... Press Ctrl+C to stop', 'info');

  // Set up a test change after 5 seconds to verify watching is working
  setTimeout(() => {
    const testCore = './core/utils/Logger.js';
    if (fs.existsSync(testCore)) {
      log('Making test change to Logger.js to verify watching...', 'debug');
      try {
        // Create a backup first
        const content = fs.readFileSync(testCore, 'utf8');
        // Add a comment to trigger a change
        fs.writeFileSync(testCore, `${content}\n// Test change ${new Date().toISOString()}`);
        log('Test change made to Logger.js', 'debug');
      } catch (error) {
        log(`Error making test change: ${error.message}`, 'error');
      }
    } else {
      log(`Cannot make test change - ${testCore} does not exist`, 'debug');
    }
  }, 5000);

  // Set up a periodic check to ensure the watcher is still active
  setInterval(() => {
    log('Watch mode is still active, awaiting changes...', 'debug');

    // Debug: list active watchers
    log(`Active watchers: ${watcher.getWatched().length}`, 'debug');

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

// Main function
async function main() {
  log('Build script started', 'info');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch');
  const specificDir = parseUserscriptDir(args);

  // Run initial build
  if (specificDir) {
    if (EXCLUDED_DIRS.includes(specificDir)) {
      log(`Cannot build excluded directory: ${specificDir}`, 'error');
    } else {
      log(`Building only ${specificDir} directory as specified`, 'info');
      await buildUserscript(specificDir);
    }
  } else {
    await buildAll();
  }

  // Start watch mode if requested
  if (watchMode) {
    watch();
  }
}

// Run the script
main().catch((error) => {
  log(`Unhandled error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
