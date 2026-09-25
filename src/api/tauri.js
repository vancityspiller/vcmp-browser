/**
 * The only module that talks to Tauri directly.
 *
 * Tauri 2 split the v1 `@tauri-apps/api` namespaces into separate plugins and
 * changed several signatures. Keeping those imports here means the rest of the
 * app sees one small, stable surface.
 */

import { Channel, invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { appDataDir } from '@tauri-apps/api/path';
import { getVersion } from '@tauri-apps/api/app';

import {
    BaseDirectory, exists, mkdir, readDir, readTextFile, remove, writeFile, writeTextFile
} from '@tauri-apps/plugin-fs';
import { message, open as openFileDialog } from '@tauri-apps/plugin-dialog';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { openUrl } from '@tauri-apps/plugin-opener';

// ======================================================= //

export { Channel, invoke, getVersion, message, openFileDialog, openUrl };

// ------------------------------------------------------- //

/**
 * Absolute path to the browser's app data directory, with a trailing separator.
 *
 * Only for paths handed to our own Rust commands — file access goes through the
 * `appData` helpers below, which use a base directory instead. Windows returns
 * an extended-length path (`\\?\C:\...`) that the Win32 calls behind those
 * commands reject, so the prefix is stripped here rather than at each call site.
 * @returns {Promise<String>}
 */
export async function appDirPath() {
    const dir = await appDataDir();
    const stripped = dir.startsWith('\\\\?\\') ? dir.slice(4) : dir;

    return stripped.endsWith('\\') ? stripped : `${stripped}\\`;
}

// ------------------------------------------------------- //

export const window = {
    close: () => getCurrentWindow().close(),
    startDragging: () => getCurrentWindow().startDragging()
};

export const clipboard = { writeText };

// ------------------------------------------------------- //

// Paths are given relative to a base directory rather than absolute. Tauri 2
// scopes filesystem access per base directory, and relative paths match those
// scopes directly instead of relying on string comparison against an absolute
// path the platform may spell differently.
const IN_APP_DATA = { baseDir: BaseDirectory.AppData };
const IN_DATA = { baseDir: BaseDirectory.Data };

/** File access under the browser's own app data directory. */
export const appData = {
    createDir: (path) => mkdir(path, {...IN_APP_DATA, recursive: true}),
    readDir: (path) => readDir(path, IN_APP_DATA),
    readTextFile: (path) => readTextFile(path, IN_APP_DATA),
    writeTextFile: (path, contents) => writeTextFile(path, contents, IN_APP_DATA),
    writeBinaryFile: (path, contents) => writeFile(path, contents, IN_APP_DATA),
    removeFile: (path) => remove(path, IN_APP_DATA),
    removeDir: (path) => remove(path, {...IN_APP_DATA, recursive: true}),
    exists: (path) => exists(path, IN_APP_DATA)
};

/** File access under %APPDATA%, which is where the game keeps its own files. */
export const roamingData = {
    createDir: (path) => mkdir(path, {...IN_DATA, recursive: true})
};

// ------------------------------------------------------- //

/**
 * Fetches JSON over Tauri's HTTP plugin, which is not bound by webview CORS.
 * @param {String} url
 * @returns {Promise<Object>} Parsed response body
 */
export async function fetchJson(url) {
    const response = await tauriFetch(url, {method: 'GET'});

    if(!response.ok) {
        throw new Error(`${url} responded ${response.status}`);
    }

    return response.json();
}

// ------------------------------------------------------- //

/**
 * Posts the updater's multipart form and returns the body.
 *
 * Tauri 2 replaced the v1 `Body`/`ResponseType` helpers with the standard fetch
 * API, so the form is a plain FormData and the caller picks the result format.
 * @param {String} url
 * @param {Object} json Value of the `json` form field
 * @param {'text'|'binary'} as Desired response format
 * @returns {Promise<String|Uint8Array>}
 */
export async function postUpdaterForm(url, json, as) {
    const form = new FormData();
    form.append('json', JSON.stringify(json));

    const response = await tauriFetch(url, {method: 'POST', body: form});

    if(!response.ok) {
        throw new Error(`${url} responded ${response.status}`);
    }

    if(as === 'binary') {
        return new Uint8Array(await response.arrayBuffer());
    }

    return response.text();
}
