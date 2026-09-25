import { appData } from '../api/tauri';

// ======================================================= //

/**
 * Reads a resource JSON file from the browser's app data directory
 * @param {String} fileName Name of the resource file
 * @returns {Promise<Object>} Parsed contents
 */
export async function loadFile(fileName) {
    return JSON.parse(await appData.readTextFile(`data\\${fileName}`));
}

// ------------------------------------------------------- //

/**
 * Writes a resource JSON file to the browser's app data directory
 * @param {String} fileName Name of the resource file
 * @param {Object} contents Contents to write, stringified as JSON
 * @returns {Promise}
 */
export async function saveFile(fileName, contents) {
    return appData.writeTextFile(`data\\${fileName}`, JSON.stringify(contents, null, 2));
}

// ------------------------------------------------------- //
