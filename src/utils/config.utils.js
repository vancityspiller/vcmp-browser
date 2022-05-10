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
        favourites: [],
        passwords: [],
        history: []
    }
};

// ------------------------------------------------------- //

export function loadConfig(setConfigLoaded, setSettings) {
    path.resourceDir()
        .then(resDirPath => {

            fs  .readDir(resDirPath)
                .then(entries => {

                    // need to create the data dir if it doesn't exist
                    if(entries.findIndex(entry => entry.name === 'data') === -1) {
                        fs.createDir(resDirPath + 'data');
                    }

                    fs  .readDir(resDirPath + 'data')
                        .then(entries => {

                            const files = ['settings', 'servers'];

                            files.forEach(file => {
                                if(entries.findIndex(entry => entry.name === `${file}.json`) == -1) {
                                    fs.writeFile({contents: JSON.stringify(fallback[file], null, 2), path: `${resDirPath}data\\${file}.json`})
                                }
                            })

                            fs.readTextFile(`${resDirPath}data\\settings.json`)
                                .then(value => {
                                    setSettings(JSON.parse(value));
                                    setConfigLoaded(true);
                                })
                                .catch();
                        })
                        .catch();
                })
                .catch();
        })
        .catch();
}