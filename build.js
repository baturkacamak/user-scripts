const rollup = require('rollup');
const createConfig = require('./rollup.config');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

/**
 * Find all userscripts in the project
 * @return {string[]} Array of script paths
 */
function findUserScripts() {
  const scripts = [];
  const dirs = fs.readdirSync('.', {withFileTypes: true})
      .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith('.') && 'node_modules' !== dirent.name && 'core' !== dirent.name);

  for (const dir of dirs) {
    const scriptPath = path.join(dir.name, `${dir.name}.js`);
    if (fs.existsSync(scriptPath)) {
      scripts.push(scriptPath);
    }
  }

  return scripts;
}

/**
 * Build a single userscript
 * @param {string} scriptPath - Path to the script
 */
async function buildScript(scriptPath) {
  console.log(`Building ${scriptPath}...`);

  try {
    const config = createConfig(scriptPath);
    const bundle = await rollup.rollup(config);
    await bundle.write(config.output);
    console.log(`✅ Successfully built ${config.output.file}`);
  } catch (error) {
    console.error(`❌ Error building ${scriptPath}:`, error);
  }
}

/**
 * Build all userscripts
 */
async function buildAll() {
  const scripts = findUserScripts();
  console.log(`Found ${scripts.length} userscripts`);

  for (const script of scripts) {
    await buildScript(script);
  }
}

/**
 * Start watch mode
 */
function watch() {
  const scripts = findUserScripts();
  console.log(`Watching ${scripts.length} userscripts...`);

  // Watch userscript files
  const scriptPatterns = scripts.map((script) => script);

  // Watch core files
  const corePattern = 'core/**/*.js';

  // Create watcher
  const watcher = chokidar.watch([...scriptPatterns, corePattern], {
    persistent: true,
  });

  // Handle file changes
  watcher.on('change', async (filePath) => {
    console.log(`File changed: ${filePath}`);

    if (filePath.startsWith('core/')) {
      // Core file changed, rebuild all scripts
      console.log('Core file changed, rebuilding all scripts...');
      await buildAll();
    } else {
      // Script file changed, rebuild just that script
      await buildScript(filePath);
    }
  });

  console.log('Watching for changes. Press Ctrl+C to stop.');
}

// Parse command line arguments
const args = process.argv.slice(2);
const isWatch = args.includes('--watch') || args.includes('-w');

if (isWatch) {
  watch();
} else {
  buildAll();
}
