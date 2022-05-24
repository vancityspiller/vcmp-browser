import { fs, os, path } from "@tauri-apps/api";

// ======================================================= //

const fallback = {

    settings: {
        updater: {
            url: 'http://v4.vcmp.net/updater/',
            password: '',
            checkOnStartup: true
        },
        master: {
            url: 'http://master.vc-mp.org/',
            useLegacy: false,
            defaultTab: 'Favorites'
        },
        playerName: '',
        gameDir: ''
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
        path.resourceDir()
        .then(resDirPath => {

            fs  .readDir(resDirPath)
                .then(async entries => {

                    // need to create the data & versions dirs if it doesn't exist
                    if(entries.findIndex(entry => entry.name === 'data') === -1) {
                        await fs.createDir(resDirPath + 'data');
                    }

                    if(entries.findIndex(entry => entry.name === 'versions') === -1) {
                        await fs.createDir(resDirPath + 'versions');
                    }

                    // is there 7zip dll
                    if(entries.findIndex(entry => entry.name === '7z.dll') === -1) {

                        // if not, is there a directory with those
                        if(entries.findIndex(entry => entry.name === '7z') === -1) {
                            reject('7zip resources not found');
                            return;

                        } else {
                            const arch = await os.arch();
                            const dllV = arch === 'x86' ? 32 : 64;

                            await fs.copyFile(`${resDirPath}7z\\7z${dllV}.dll`, `${resDirPath}7z.dll`);
                        }
                    }

                    fs  .readDir(resDirPath + 'data')
                        .then(async entries => {

                            const files = ['settings', 'servers'];
                            
                            await Promise.all(files.map(file => {
                                if(entries.findIndex(entry => entry.name === `${file}.json`) == -1) {
                                    return fs.writeFile({contents: JSON.stringify(fallback[file], null, 2), path: `${resDirPath}data\\${file}.json`});
                                }
                            }));

                            resolve();
                        })
                        .catch();
                })
                .catch(() => reject('Could not read resource directory'));
        })
        .catch(() => reject('Could not read path to resource directory'));
    })
}

// ------------------------------------------------------- //