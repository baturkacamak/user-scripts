const {nodeResolve} = require('@rollup/plugin-node-resolve');
const metablock = require('rollup-plugin-userscript-metablock');
const path = require('path');
const fs = require('fs');

/**
 * Create Rollup config for a userscript
 * @param {string} scriptPath - Path to the script
 * @return {Object} Rollup config
 */
function createConfig(scriptPath) {
  const directory = path.dirname(scriptPath);
  const filename = path.basename(scriptPath);
  const outputFilename = filename.replace(/\.js$/, '.user.js');
  const metaPath = path.join(directory, 'meta.json');

  // Check if meta.json exists
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Meta file not found: ${metaPath}`);
  }

  return {
    input: scriptPath,
    output: {
      file: path.join(directory, outputFilename),
      format: 'iife',
    },
    plugins: [
      nodeResolve(),
      metablock({
        file: metaPath,
      }),
    ],
  };
}

module.exports = createConfig;
