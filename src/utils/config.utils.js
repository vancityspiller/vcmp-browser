import { fs, path } from "@tauri-apps/api";

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

    return new Promise((resolve) => {
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
                .catch();
        })
        .catch();
    })
}

// ======================================================= //