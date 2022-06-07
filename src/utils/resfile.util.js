import { fs, path } from "@tauri-apps/api";

// ======================================================= //

/**
 * Reads a resource text file from %APP%
 * @param {String} fileName Name of the resource file
 * @returns {Promise<Object>} Resolves with the contents of file after JSON parsing
 */
export async function loadFile(fileName) {

    return new Promise((resolve, reject) => {
        path.appDir()
            .then(resDirPath => {
                fs.readTextFile(`${resDirPath}data\\${fileName}`)
                    .then(file => resolve(JSON.parse(file)))
                    .catch(() => reject());
            })
            .catch(() => reject());
    });
}

// ------------------------------------------------------- //

/**
 * Writes a resource text file to %APP%
 * @param {String} fileName Name of the resource file
 * @param {Object} contents Contents to write, stringified as JSON
 * @returns {Promise} Resolves after writing
 */
export async function saveFile(fileName, contents) {

    return new Promise((resolve, reject) => {
        path.appDir()
            .then(resDirPath => {
                fs.writeFile({path: `${resDirPath}data\\${fileName}`, contents: JSON.stringify(contents, null, 2)})
                .then(() => resolve())
                .catch(() => reject());
            })
            .catch(() => reject());
    });
}

// ------------------------------------------------------- //