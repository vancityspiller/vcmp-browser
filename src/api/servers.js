import { Channel, invoke } from './tauri';

// ======================================================= //

/**
 * @typedef ServerData
 * @property {String} ip IP address, ip:port format.
 * @property {?Number} ping Round trip in ms, or null if the server never answered.
 * @property {String} version Server version.
 * @property {boolean} password Whether the server is password protected.
 * @property {Number} numPlayers The number of players in the server.
 * @property {Number} maxPlayers Maximum player slots in the server.
 * @property {String} serverName Name of the server.
 * @property {String} gameMode Gamemode string.
 * @property {String} mapName [Vice City]
 * @property {String[]} players Array of player names.
 * @property {boolean} isFavorite [false] Applied by the list, not the backend.
 */

// ------------------------------------------------------- //

/**
 * Queries every given server at once, reporting each result as it arrives.
 *
 * The backend uses a single socket for the whole list, so this takes about as
 * long as the slowest server rather than the sum of all of them. Results arrive
 * in whatever order the servers answer.
 * @param {{ip: String, port: Number}[]} servers
 * @param {function(ServerData): void} onResult Called once per server
 * @returns {Promise} Resolves when every server has answered or timed out
 */
export function queryServers(servers, onResult) {

    if(servers.length === 0) {
        return Promise.resolve();
    }

    const channel = new Channel();
    channel.onmessage = onResult;

    return invoke('query_servers', {servers: servers, onResult: channel});
}

// ------------------------------------------------------- //

/**
 * Queries a single server.
 * @param {String} ip
 * @param {Number} port
 * @returns {Promise<ServerData>}
 */
export async function queryServer(ip, port) {

    let result = null;
    await queryServers([{ip: ip, port: port}], r => { result = r; });

    return result;
}
