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

export function loadConfig(setConfigLoaded, setSettings, setServers) {
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
                                        .catch();
                                }
                            });

                            fs.readTextFile(`${resDirPath}data\\servers.json`)
                                .then(value => {
                                    setServers({type: 'LOAD', value: JSON.parse(value)});
                                })
                                .catch();

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

// ======================================================= //

function ServersReducer() {

    const reducerFunc = (prev, action) => {

        switch(action.type) {
            case 'ADD':
                {
                    const borrowed = {...prev};
                    borrowed[action.key].push(action.value);
                    console.log(borrowed);
                    return borrowed;
                }

            case 'REMOVE':
                {
                    const borrowed = {...prev};
                    borrowed[action.key] = prev[action.key].filter(action.value);
                    console.log(borrowed);
                    return borrowed;
                }       
                
            case "LOAD":
                {
                    return action.value;
                }

            case "SAVE":
                {
                    path.resourceDir()
                        .then(resDirPath => {
                            fs.writeFile({path: `${resDirPath}data\\servers.json`, contents: JSON.stringify(State, null, 2)})
                                .catch();
                        })
                        .catch();
                }
        }
        
    }

    const [State, Dispatch] = useReducer(reducerFunc, {...fallback.servers});
    return [State, Dispatch];
}

export function useServers() {
    return ServersReducer();
}