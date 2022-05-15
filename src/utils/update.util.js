import { fs, http, invoke, path } from "@tauri-apps/api";
import { Body, ResponseType } from "@tauri-apps/api/http";

// ======================================================= //

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

            path.resourceDir()
                .then(resDirPath => {

                    fs.readDir(`${resDirPath}versions`)
                        .then(async entries => {

                            const savePath = `${resDirPath}versions\\${version}\\`;

                            if(entries.findIndex(entry => entry.name === version) === -1) {
                                await fs.createDir(savePath);
                            } else {
                                await fs.removeDir(savePath, {recursive: true});
                                await fs.createDir(savePath);
                            }

                            fs.createDir(`${savePath}images`);

                            fs.writeBinaryFile({contents: r.data, path: `${savePath}version.7z`})
                                .then(() => {
                                    invoke("extract7z", {path: `${savePath}version.7z`, dest: savePath})
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

export async function buildVersions() {

    return new Promise(resolve => {
        const versions = {};
    
        path.resourceDir()
            .then(resDirPath => {
                fs.readDir(`${resDirPath}versions`)
                    .then(async entries => {

                        const versionList = await Promise.all(entries.map(entry => {
                            return fs.readTextFile(`${resDirPath}versions\\${entry.name}\\version.txt`);
                        }));

                        versionList.forEach((v, i) => {
                            versions[entries[i].name] = v;
                        });

                        resolve(versions);      
                    });
            });
    });
}