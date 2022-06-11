import { invoke } from "@tauri-apps/api";

// ======================================================= //

/**
 * @typedef ServerData
 * @property {String} ip IP address, ip:port format.
 * @property {String} version Server version.
 * @property {boolean} password Whether the server is password
 * @property {Number} numPlayers The number of players in the server
 * @property {Number} maxPlayers Maximum player slots in the server
 * @property {String} serverName Name of the server
 * @property {String} gameMode Gamemode string
 * @property {String} mapName [Vice City]
 * @property {String[]} players Array of player names
 * @property {Number} ping Ping (in ms)
 * @property {boolean} isFavorite [false]
 */

// ------------------------------------------------------- //

/**
 * Fetches server info using Rust UDPSocket
 * @param {Object[]} serverList 
 * @param {String} serverList.ip
 * @param {Number} serverList.port
 * @returns {Promise<ServerData>}
 */
export const performUDP = async (ip, port) => {
    return new Promise(async (resolve, reject) => {
        invoke('info', {ip: ip + ":" + port, send: `VCMP${ip.slice(0, 4)}${port.toString().slice(0, 2)}`})
            .then(message => {
                const serverInfo = JSON.parse(message);
                parseServerData(serverInfo)
                    .then(result => resolve(result))
                    .catch(() => reject());
            })
            .catch(e => console.log(e))
    });
}

// ------------------------------------------------------- //

/**
 * Helper function to parse server data into actual values
 * @param {Object} serverInfo 
 * @param {String} serverInfo.ip
 * @param {Uint8Array} serverInfo.info list of server parameters
 * @param {Uint8Array} serverInfo.players list of players 
 * @param {String} serverInfo.ping
 * @returns {Promise<ServerData>}
 */
const parseServerData = async (serverInfo) => {

    return new Promise(async (resolve) => {
        if(serverInfo.info.length === 1) {
            resolve({ip: serverInfo.ip, ping: null});
            return;
        }

        // get offsets
        const isR2 = Utf8ArrayToStr(serverInfo.info.slice(0, 4)) === 'VCMP';
        const offsets = getOffsets(isR2);

        // ------------------------------------------------------- //

        // we know server, gamemode and map name do not have fixed indexes
        const   len_server = offsets.extraData + serverInfo.info.slice(offsets.extraDataLen, offsets.extraDataLen + 3)
                            .reduce((p, n) => p + n),

                len_gamemode = len_server + 4 + serverInfo.info.slice(len_server, len_server + 3)
                            .reduce((p, n) => p + n),

                len_map = isR2 ? 0 : len_gamemode + 4 + serverInfo.info.slice(len_gamemode, len_gamemode + 3)
                            .reduce((p, n) => p + n);

        // ------------------------------------------------------- //

        const parsedData = {

            ip: serverInfo.ip,

            // doesn't occupy whole 12 bytes alloted to it
            version: isR2 ? '03zR2' : Utf8ArrayToStr(serverInfo.info.slice(11, 19)),

            // single byte alloted to password
            password: serverInfo.info[offsets.password] === 0 ? false : true,

            // need to treat these differently, multiple bytes for single integer
            numPlayers: parseInt(serverInfo.info.slice(offsets.numPlayers, offsets.numPlayers + 1)
                            .reduce((p, n) => p + n)), 

            maxPlayers: serverInfo.info.slice(offsets.maxPlayers, offsets.maxPlayers + 1)
                            .reduce((p, n) => p + n),
            
            // strlen is provided for following values
            serverName: Utf8ArrayToStr(serverInfo.info.slice(offsets.extraData, len_server)),
            gameMode: Utf8ArrayToStr(serverInfo.info.slice(len_server + 4, len_gamemode)),

            // obsolete for 0.3
            mapName: isR2 ? 'Vice City' : Utf8ArrayToStr(serverInfo.info.slice(len_gamemode + 4, len_map)),

            players: [],
            ping: parseInt(serverInfo.ping),

            // will map this later with our favorites
            isFavorite: false
        }

        // ------------------------------------------------------- //

        // seems like map name is sent alongwith game mode for 0.3
        if(isR2) {
            const [actGameMode] = parsedData.gameMode.split('Vice-City');
            parsedData.gameMode = actGameMode;
        }

        // players are in a continuous fashion of strlen followed by name
        let lastLen = 13;
        for(let i = 0 ; i < parsedData.numPlayers ; i++) {

            const len_player = serverInfo.players[lastLen];        
            parsedData.players.push(Utf8ArrayToStr(serverInfo.players.slice(lastLen + 1, lastLen + 1 + len_player)));

            // player's score is also broadcasted in 0.3 R2
            lastLen += len_player + (isR2 ? 2 : 1); 
        }
    
        resolve(parsedData);
    })
}

// ======================================================= //

/**
 * Returns data offsets depending on VCMP version
 * @param {boolean} isR2 are we dealing with 0.3 R2?
 */
function getOffsets(isR2) {

    const offsets = {
        password: 23,
        numPlayers: 24,
        maxPlayers: 26,
        extraDataLen: 28,
        extraData: 32
    };

    // for 0.3 R2
    if(isR2) {
        offsets.password = 11;
        offsets.numPlayers = 12;
        offsets.maxPlayers = 14;
        offsets.extraDataLen = 15;
        offsets.extraData = 20;
    }

    return offsets;
}

// ------------------------------------------------------- //

/**
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free. You can redistribute it and/or modify it.
 * @param {Uint8Array} array
 * @returns {String}
 */
function Utf8ArrayToStr(array) {

    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while(i < len) {
        c = array[i++];
        switch(c >> 4)
        { 
            case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
                // 0xxxxxxx
                out += String.fromCharCode(c);
                break;
            case 12: case 13:
                // 110x xxxx   10xx xxxx
                char2 = array[i++];
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = array[i++];
                char3 = array[i++];
                out += String.fromCharCode(((c & 0x0F) << 12) |
                            ((char2 & 0x3F) << 6) |
                            ((char3 & 0x3F) << 0));
                break;
        }
    }

    return out;
}