import { useReducer } from 'react';
import { fs, path } from "@tauri-apps/api";

// ======================================================= //

const fallback = {

    settings: {
        updater: {
            url: 'http://v4.vcmp.net/updater',
            password: '',
        },
        master: {
            url: 'http://master.vc-mp.org/',
            useLegacy: false,
            defaultTab: 'Masterlist'
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

export async function checkConfig(setConfigLoaded) {
    path.resourceDir()
        .then(resDirPath => {

            fs  .readDir(resDirPath)
                .then(entries => {

                    // need to create the data dir if it doesn't exist
                    if(entries.findIndex(entry => entry.name === 'data') === -1) {
                        fs.createDir(resDirPath + 'data');
                    }

                    fs  .readDir(resDirPath + 'data')
                        .then(async entries => {

                            const files = ['settings', 'servers'];
                            
                            await Promise.all(files.map(file => {
                                if(entries.findIndex(entry => entry.name === `${file}.json`) == -1) {
                                    return fs.writeFile({contents: JSON.stringify(fallback[file], null, 2), path: `${resDirPath}data\\${file}.json`});
                                }
                            }));

                            setConfigLoaded(true);
                        })
                        .catch();
                })
                .catch();
        })
        .catch();
}

// ======================================================= //