import { http, invoke } from "@tauri-apps/api";

// ======================================================= //

/**
 * Fetches server info using Rust UDPSocket
 * @param {Object[]} serverList 
 * @param {String} serverList.ip
 * @param {Number} serverList.port
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
 */
const parseServerData = async (serverInfo) => {

    return new Promise(async (resolve) => {
        if(serverInfo.info.length === 1) {
            resolve({ip: serverInfo.ip, ping: null});
            return;
        }

        // we know server, gamemode and map name are not fixed at indexes
        const   len_server = 32 + serverInfo.info.slice(28, 31).reduce((p, n) => p + n),
                len_gamemode = len_server + 4 + serverInfo.info.slice(len_server, len_server + 3).reduce((p, n) => p + n),
                len_map = len_gamemode + 4 + serverInfo.info.slice(len_gamemode, len_gamemode + 3).reduce((p, n) => p + n);

        const parsedData = {

            ip: serverInfo.ip,

            // doesn't occupy whole 12 bytes alloted to it
            version: await Utf8ArrayToStr(serverInfo.info.slice(11, 19)),

            // single byte alloted to password
            password: serverInfo.info[23] === 0 ? false : true,

            // need to treat these differently, multiple bytes for single integer
            numPlayers: parseInt(serverInfo.info.slice(24, 25).reduce((p, n) => p + n)), 
            maxPlayers: serverInfo.info.slice(26, 27).reduce((p, n) => p + n),
            
            // strlen is provided for following values
            serverName: await Utf8ArrayToStr(serverInfo.info.slice(32, len_server)),
            gameMode: await Utf8ArrayToStr(serverInfo.info.slice(len_server + 4, len_gamemode)),
            mapName: await Utf8ArrayToStr(serverInfo.info.slice(len_gamemode + 4, len_map)),

            players: [],
            ping: parseInt(serverInfo.ping),

            // will map this later with our favorites
            isFavorite: false
        }

        // players are in a continuous fashion of strlen followed by name
        let lastLen = 13;
        for(let i = 0 ; i < parsedData.numPlayers ; i++) {

            const len_player = serverInfo.players[lastLen];        
            parsedData.players.push(await Utf8ArrayToStr(serverInfo.players.slice(lastLen + 1, lastLen + 1 + len_player)));

            lastLen += len_player + 1;
        }
    
        resolve(parsedData);
    })
}

// ------------------------------------------------------- //

/**
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 * @param {Uint8Array} array
 */
async function Utf8ArrayToStr(array) {

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