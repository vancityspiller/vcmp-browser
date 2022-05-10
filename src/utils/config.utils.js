import { fs, http, invoke, path } from "@tauri-apps/api";

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

                            http.fetch('http://master.vc-mp.org/servers')
                                .then(response => {

                                    // invoke('info', {sendString: JSON.stringify(response.data), ipAddr: "162.220.244.94:8192"})
                                    invoke('info', {sendString: `{"success":true,"servers":[{"ip":"51.178.65.136","port":8194,"is_official":false},{"ip":"51.178.65.136","port":5192,"is_official":false},{"ip":"5.135.145.71","port":5196,"is_official":true},{"ip":"51.254.127.97","port":8223,"is_official":true},{"ip":"5.12.57.220","port":8192,"is_official":true},{"ip":"51.75.30.113","port":8194,"is_official":true},{"ip":"51.38.93.130","port":8192,"is_official":true},{"ip":"51.255.193.118","port":8192,"is_official":true},{"ip":"51.255.102.244","port":5196,"is_official":true},{"ip":"91.121.134.5","port":8194,"is_official":true},{"ip":"23.100.7.37","port":8192,"is_official":true},{"ip":"51.178.65.136","port":2502,"is_official":false},{"ip":"51.178.65.136","port":5190,"is_official":false},{"ip":"5.166.34.47","port":8192,"is_official":false},{"ip":"5.2.79.73","port":8169,"is_official":false},{"ip":"5.2.79.73","port":8192,"is_official":false},{"ip":"5.2.79.73","port":8194,"is_official":false}]}`})
                                    .then(message => {
                                        const rawServers = JSON.parse(message).servers;
                                        const filteredServers = rawServers.filter(value => value.info !== "INVALID");
                                        const servers = filteredServers.map(value => {
                                            return {
                                                ip: value.ip,
                                                ping: value.ping,
                                                players: value.players,
                                                info:  value.info.replace(/\u0000/g, "")
                                            };
                                        });

                                        console.log(servers);
                                    })
                                });

                            // invoke('info', {sendString: 'VCMP162.81', ipAddr: "162.220.244.94:8192"})
                            // .then(message => console.log(message))
                        })
                        .catch();
                })
                .catch();
        })
        .catch();
}