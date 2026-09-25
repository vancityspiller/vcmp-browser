import { appData, roamingData } from '../api/tauri';

// ======================================================= //

// default settings for the browser
const fallback = {

    settings: {
        updater: {
            url: 'https://u04.vc-mp.org/',
            password: '',
            checkOnStartup: true
        },
        master: {
            url: 'http://master.vc-mp.org/',
            defaultTab: 'Favorites'
        },
        richPresence: {
            enabled: true,
            minimal: false
        },
        playerName: '',
        gameDir: '',
        isSteam: false
    },

    servers: {
        favorites: [],
        passwords: [],
        history: [],
        hidden: []
    }
};

// ------------------------------------------------------- //

// hosts that no longer resolve to a working service; settings pointing at them
// are rewritten on load, otherwise the stored value wins the merge below and an
// existing install stays broken forever
const DEAD_UPDATER_URLS = [
    'https://v4.vcmp.net/updater/',
    'http://v4.vcmp.net/updater/'
];

// store a maximum of this many recently played servers
const MAX_HISTORY = 20;

// ------------------------------------------------------- //

/**
 * Applies fallbacks to a settings file and repairs values that can no longer work
 * @param {Object} settingsFile Parsed contents of settings.json
 * @returns {Object} The settings to persist
 */
function migrateSettings(settingsFile) {

    const settings = {...fallback.settings, ...settingsFile};

    // nested objects need merging separately, a spread only goes one level deep
    settings.updater = {...fallback.settings.updater, ...settingsFile.updater};
    settings.master = {...fallback.settings.master, ...settingsFile.master};

    if(DEAD_UPDATER_URLS.includes(settings.updater.url)) {
        settings.updater.url = fallback.settings.updater.url;
    }

    // removed features, drop them so the file doesn't carry dead keys around
    delete settings.httpDownloads;
    delete settings.master.useLegacy;

    return settings;
}

// ------------------------------------------------------- //

/**
 * Verifies browser config and resources, creates them if they do not exist
 * @returns {Promise} Resolves after verifying, rejects with a reason otherwise.
 */
export async function checkConfig() {

    try {
        // recursive creation is a no-op when the directory already exists
        await appData.createDir('data');
        await appData.createDir('versions');

        // the game reads its downloaded server content from here
        await roamingData.createDir('VCMP\\04beta\\store');

    } catch {
        throw new Error('Could not create app directories');
    }

    // ------------------------------------------------------- //

    const entries = await appData.readDir('data');

    await Promise.all(['settings', 'servers'].map(file => {
        if(entries.findIndex(entry => entry.name === `${file}.json`) !== -1) {
            return null;
        }

        return appData.writeTextFile(`data\\${file}.json`, JSON.stringify(fallback[file], null, 2));
    }));

    // ------------------------------------------------------- //

    const settingsFile = JSON.parse(await appData.readTextFile('data\\settings.json'));
    await appData.writeTextFile('data\\settings.json',
        JSON.stringify(migrateSettings(settingsFile), null, 2));

    const serversFile = JSON.parse(await appData.readTextFile('data\\servers.json'));
    const servers = {...fallback.servers, ...serversFile};

    if(servers.history.length > MAX_HISTORY) {
        servers.history = servers.history.slice(-MAX_HISTORY);
    }

    await appData.writeTextFile('data\\servers.json', JSON.stringify(servers, null, 2));
}

// ------------------------------------------------------- //
