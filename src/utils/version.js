const path = require('path');
const fs = require('fs');

/**
 * Get the version from package.json
 * @returns {string} The version string from package.json
 */
function getVersion() {
    try {
        const packagePath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return packageJson.version;
    } catch (error) {
        console.warn('Warning: Could not read version from package.json, using fallback version');
        return '1.0.0';
    }
}

module.exports = {
    getVersion
};
