import { fs, path } from "@tauri-apps/api";

// ======================================================= //

const fallback = {

    settings: {
        updaterURL: 'http://v4.vcmp.net/updater',
        masterURL: 'http://master.vc-mp.org',
        playerName: '',
        gameDir: ''
    },

    servers: {
        favourites: {},
        passwords: {},
        history: {}
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
                                    fs.writeFile({contents: JSON.stringify(fallback[file], null, 4), path: `${resDirPath}data\\${file}.json`})
                                }
                            })

                            fs.readTextFile(`${resDirPath}data\\settings.json`)
                                .then(value => setSettings(JSON.parse(value)))
                                .catch();

                            setConfigLoaded(true);
                        })
                        .catch();
                })
                .catch();
        })
        .catch();
}