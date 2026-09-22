import { useMemo } from 'react';

// --------------------------------------------------------- //

// stand-in row for a server that hasn't answered yet; the high ping keeps it
// sorted to the bottom
const WAITING_ROW = {
    ping: 9999,
    serverName: 'Waiting for server data...',
    gameMode: '',
    numPlayers: 0,
    maxPlayers: 0,
    version: '',
    password: false,
    isFavorite: false,
    players: []
};

// --------------------------------------------------------- //

/**
 * Does a row match the search term?
 * Server name, address and player names are all searchable.
 */
function matches(server, term) {

    if(server.serverName.toLowerCase().includes(term)) return true;
    if(server.ip.toLowerCase().includes(term)) return true;

    return server.players.some(player => player.toLowerCase().includes(term));
}

// --------------------------------------------------------- //

/**
 * Orders two rows by the chosen column.
 * Lower ping is better, so it sorts opposite to everything else.
 */
function compare(a, b, {column, mode}) {

    let x = a[column];
    let y = b[column];

    // strings are ordered by first character, as they were before
    if(typeof x === 'string') x = x.charCodeAt(0);
    if(typeof y === 'string') y = y.charCodeAt(0);

    const ascending = column === 'ping' ? mode === 'asc' : mode === 'des';

    return ascending ? x - y : y - x;
}

// --------------------------------------------------------- //

/**
 * Turns the raw server list into the rows the table shows.
 *
 * @returns {{rows: Object[], totalPlayers: Number}}
 */
export function useServerFilters({
    list, search, sort, favoriteList, hiddenList, showLocked, recentsTab, favoritesTab
}) {

    // Dashboard sets the tab before servers.json has finished loading, so these
    // can still be null on the first render after a tab is chosen.
    favoriteList = favoriteList ?? [];
    hiddenList = hiddenList ?? [];

    const rows = useMemo(() => {

        let result = list;

        // recents keep showing servers the user chose to hide elsewhere
        if(!recentsTab) {
            result = result.filter(v => !hiddenList.includes(v.ip));
        }

        // --------------------------------------------------------- //

        // favorites and recents are lists the user curated, so entries that
        // haven't answered still get a row; other tabs just drop them
        if(favoritesTab || recentsTab) {
            result = result.map(v => v.ping === null ? {...v, ...WAITING_ROW} : v);
        } else {
            result = result.filter(v => v.ping !== null);
        }

        if(!showLocked) {
            result = result.filter(v => !v.password);
        }

        // --------------------------------------------------------- //

        result = result.map(v => {
            const favorite = favoriteList.find(fav => `${fav.ip}:${fav.port}` === v.ip);

            if(!favorite) return {...v, isFavorite: false};

            // recents carry their own addedAt, so don't overwrite it
            return recentsTab
                ? {...v, isFavorite: true}
                : {...v, isFavorite: true, addedAt: favorite.addedAt};
        });

        // --------------------------------------------------------- //

        const term = search.trim().toLowerCase();
        if(term !== '') {
            result = result.filter(server => matches(server, term));
        }

        // servers arrive ordered by response time, which is a useful default
        if(sort.mode && sort.column) {
            result = [...result].sort((a, b) => compare(a, b, sort));
        }

        return result;

    }, [list, search, sort, favoriteList, hiddenList, showLocked, recentsTab, favoritesTab]);

    // --------------------------------------------------------- //

    const totalPlayers = useMemo(
        () => rows.reduce((sum, v) => sum + (v.players?.length ?? 0), 0),
        [rows]
    );

    return {rows, totalPlayers};
}

export { WAITING_ROW };
