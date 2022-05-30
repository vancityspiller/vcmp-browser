import { fs, http, os, path } from "@tauri-apps/api";

// ======================================================= //

const fallback = {

    settings: {
        updater: {
            url: 'https://v4.vcmp.net/updater/',
            password: '',
            checkOnStartup: true
        },
        master: {
            url: 'http://master.vc-mp.org/',
            useLegacy: false,
            defaultTab: 'Favorites'
        },
        playerName: '',
        gameDir: '',
        enableRichPresence: true,
        httpDownloads: true,
        isSteam: false
    },

    servers: {
        favorites: [],
        passwords: [],
        history: []
    }
};

// ------------------------------------------------------- //

export async function checkConfig() {

    return new Promise((resolve, reject) => {

        // put http download links in storage (don't need to wait for it)
        http.fetch("https://v4.vcmp.net/httpdownloads")
            .then(r => {
                localStorage.setItem('httpd', JSON.stringify(r.data));
            })
            .catch(() => {
                localStorage.setItem('httpd', '[]');
            });

        // ------------------------------------------------------- //

        path.appDir()
        .then(async resDirPath => {

            try {
                await fs.createDir(resDirPath);
            } catch (error) {
                // must already exist
            }

            // ------------------------------------------------------- //

            fs  .readDir(resDirPath)
                .then(async entries => {

                    // need to create the data & versions dirs if it doesn't exist
                    if(entries.findIndex(entry => entry.name === 'data') === -1) {
                        await fs.createDir(resDirPath + 'data');
                    }

                    if(entries.findIndex(entry => entry.name === 'versions') === -1) {
                        await fs.createDir(resDirPath + 'versions');
                    }

                    // ------------------------------------------------------- //

                    // is there VCMP folder
                    const appDataPath = await path.dataDir();
                    const appDataEntries = await fs.readDir(appDataPath);

                    // if not, create it and all subdirectories
                    if(appDataEntries.findIndex(v => v.name === 'VCMP') === -1) {
                        await fs.createDir(appDataPath + 'VCMP');
                        await fs.createDir(appDataPath + 'VCMP\\04beta');
                        await fs.createDir(appDataPath + 'VCMP\\04beta\\store');
                    } else {

                        // otherwise check if subdirs exist
                        const VCMPEntries = await fs.readDir(appDataPath + 'VCMP');

                        if(VCMPEntries.findIndex(v => v.name === '04beta') === -1) {
                            await fs.createDir(appDataPath + 'VCMP\\04beta');
                            await fs.createDir(appDataPath + 'VCMP\\04beta\\store');
                        } else {

                            const BetaEntries = await fs.readDir(appDataPath + 'VCMP\\04beta');
                            if(BetaEntries.findIndex(v => v.name === 'store') === -1) {
                                await fs.createDir(appDataPath + 'VCMP\\04beta\\store');
                            }
                        }
                    }

                    // ------------------------------------------------------- //

                    fs  .readDir(resDirPath + 'data')
                        .then(async entries => {

                            const files = ['settings', 'servers'];
                            
                            await Promise.all(files.map(file => {
                                if(entries.findIndex(entry => entry.name === `${file}.json`) == -1) {
                                    return fs.writeFile({contents: JSON.stringify(fallback[file], null, 2), path: `${resDirPath}data\\${file}.json`});
                                }
                            }));

                            const serversFile = JSON.parse(await fs.readTextFile(`${resDirPath}data\\servers.json`));

                            // store a maximum of 20 recents
                            if(serversFile.history.length > 20) {
                                serversFile.history = serversFile.history.slice(-20);
                                await fs.writeFile({contents: JSON.stringify(serversFile, null, 2), path: `${resDirPath}data\\servers.json`});
                            }

                            resolve();
                        })
                        .catch();
                })
                .catch(() => reject('Could not read app directory'));
        })
        .catch(() => reject('Could not read path to app directory'));
    })
}

// ------------------------------------------------------- //