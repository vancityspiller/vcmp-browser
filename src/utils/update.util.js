import { fs, http, invoke, path } from "@tauri-apps/api";
import { Body, ResponseType } from "@tauri-apps/api/http";

// ======================================================= //

/**
 * @typedef UpdaterSettings
 * @property {string} url Updater URL.
 * @property {string} password Updater Password - Currently obsolete.
 */

/**
 * Checks for VC:MP version updates
 * @param {UpdaterSettings} updater 
 * @returns 
 */
export async function runUpdater(updater) {
    
    const currentVersions = await buildVersions();

    return new Promise((resolve, reject) => {
        checkVersions(updater, currentVersions)
            .then(versions => {

                if(versions.length === 0) {
                    resolve();
                    return;
                }

                versions.forEach(v => {
                    downloadVersion(updater, v)
                        .then(() => resolve())
                        .catch(() => reject());
                })
            })
            .catch(() => reject());
    })
}

// ======================================================= //

/**
 * Checks for versions available to download
 * @param {UpdaterSettings} updater 
 * @param {Object} versions 
 * @returns {Promise<String[]>} Resolves with an array of versions available for update
 */
export async function checkVersions(updater, versions) {

    return new Promise((resolve, reject) => {
        http.fetch(`${updater.url}check`, {
            method: 'POST',
            headers: {
                'content-type': 'multipart/form-data'
            },
            body: Body.form({
                "json": JSON.stringify({
                    'password': updater.password,
                    'versions': versions
                })
            }),
            responseType: ResponseType.Text
        })
    
        // ------------------------------------------------------- //
    
            .then(r => {
                if(r.data.length > 0) {
                    resolve(r.data.split('|'));
                } else {
                    resolve('');
                }
            })
            .catch(() => reject());
    });
}

// ======================================================= //

/**
 * Downloads a version from the updater
 * @param {UpdaterSettings} updater 
 * @param {String} version The version to download
 * @returns {Promise} Resolves after downloading the version from updater
 */
export async function downloadVersion(updater, version) {

    return new Promise((resolve, reject) => {
        http.fetch(`${updater.url}download`, {
            method: 'POST',
            headers: {
                'content-type': 'multipart/form-data'
            },
            body: Body.form({
                "json": JSON.stringify({
                    'password': updater.password,
                    'version': version
                })
            }),
            responseType: ResponseType.Binary
        })
        .then(async r => {

            path.appDataDir()
                .then(resDirPath => {

                    fs.readDir(`${resDirPath}versions`)
                        .then(async entries => {

                            const savePath = `${resDirPath}versions\\${version}\\`;
                            
                            let savePathAlt = savePath;
                            if(savePath.startsWith('\\\\?\\')) {
                                savePathAlt = savePath.slice(4);
                            }

                            if(entries.findIndex(entry => entry.name === version) === -1) {
                                await fs.createDir(savePath);
                            } else {
                                await fs.removeDir(savePath, {recursive: true});
                                await fs.createDir(savePath);
                            }

                            fs.writeBinaryFile({contents: r.data, path: `${savePath}version.7z`})
                                .then(() => {
                                    invoke("extract7z", {path: `${savePathAlt}version.7z`, dest: savePathAlt})
                                        .then(() => {
                                            fs.removeFile(`${savePath}version.7z`)
                                                .then(() => resolve())
                                        })
                                });
                        })
                })
        })
        .catch(() => reject());
    })
}

// ======================================================= //

/**
 * Returns a list of locally available versions
 * @returns {Promise<Object>}
 */
export async function buildVersions() {

    return new Promise(resolve => {
        const versions = {};
    
        path.appDataDir()
            .then(resDirPath => {
                fs.readDir(`${resDirPath}versions`, {recursive: true})
                    .then(async entries => {

                        const versionList = await Promise.all(entries.map(entry => {

                            if(entry.children && (entry.children.findIndex(v => v.name === 'version.txt') !== -1)) {
                                 return fs.readTextFile(`${resDirPath}versions\\${entry.name}\\version.txt`);
                            } else {
                                return new Promise(resolve => resolve(null));
                            }
                        }));                    

                        versionList.forEach((v, i) => {
                            if(v === null) return;
                            versions[entries[i].name] = v;
                        });
                        
                        resolve(versions);
                    });
            });
    });
}