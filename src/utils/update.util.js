import { fs, http, path } from "@tauri-apps/api";
import { Body, ResponseType } from "@tauri-apps/api/http";

// ======================================================= //

export async function runUpdater(updater) {
    
    return new Promise((resolve, reject) => {
        checkVersions(updater, buildVersions())
            .then(versions => {

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
                .then(async resDirPath => {

                    fs.readDir(`${resDirPath}versions`)
                        .then(async entries => {

                            if(entries.findIndex(entry => entry.name === version) === -1) {
                                await fs.createDir(resDirPath + version);
                            }

                            fs.writeBinaryFile({contents: r.data, path: `${resDirPath}versions\\${version}\\version.7z`})
                                .then(() => resolve());
                        })
                })
        })
        .catch(() => reject());
    })
}

// ======================================================= //

function buildVersions() {

    const versions = {};
    
    path.resourceDir()
        .then(resDirPath => {
            fs.readDir(`${resDirPath}versions`)
                .then(entries => {
                    fs.readTextFile(`${resDirPath}versions\\${entries.name}\version.txt`)
                        .then(version => {
                            versions[entries.name] = version;
                        })
                        .catch(() => {});
                })
        })

    return versions;
}