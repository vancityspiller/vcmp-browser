import { appData, appDirPath, invoke, postUpdaterForm } from '../api/tauri';

// ======================================================= //

/**
 * @typedef UpdaterSettings
 * @property {string} url Updater URL.
 * @property {string} password Updater Password - Currently obsolete.
 */

/**
 * Downloads any locally installed VC:MP version the updater considers stale
 * @param {UpdaterSettings} updater
 * @returns {Promise}
 */
export async function runUpdater(updater) {

    const installed = await buildVersions();
    const outdated = await checkVersions(updater, installed);

    // sequential: each version is a multi-megabyte archive
    for(const version of outdated) {
        await downloadVersion(updater, version);
    }
}

// ======================================================= //

/**
 * Asks the updater which of the given versions are out of date.
 *
 * This compares hashes; it does not tell you whether a version exists. Sending
 * a hash the updater has never seen reports an update regardless, so this
 * cannot be used to test availability - only `downloadVersion` can.
 * @param {UpdaterSettings} updater
 * @param {Object} versions Map of version name to its installed hash
 * @returns {Promise<String[]>} Versions with a differing hash
 */
export async function checkVersions(updater, versions) {

    const body = await postUpdaterForm(
        `${updater.url}check`,
        {password: updater.password, versions: versions},
        'text'
    );

    return body.length > 0 ? body.split('|') : [];
}

// ======================================================= //

/**
 * Downloads a version from the updater and extracts it into place
 * @param {UpdaterSettings} updater
 * @param {String} version The version to download
 * @returns {Promise}
 */
export async function downloadVersion(updater, version) {

    const archive = await postUpdaterForm(
        `${updater.url}download`,
        {password: updater.password, version: version},
        'binary'
    );

    // ------------------------------------------------------- //

    const dir = `versions\\${version}`;

    if(await appData.exists(dir)) {
        await appData.removeDir(dir);
    }

    await appData.createDir(dir);

    const archivePath = `${dir}\\version.7z`;
    await appData.writeBinaryFile(archivePath, archive);

    // extract7z is our own command, so it needs absolute paths
    const root = await appDirPath();
    await invoke('extract7z', {path: `${root}${archivePath}`, dest: `${root}${dir}\\`});

    await appData.removeFile(archivePath);
}

// ======================================================= //

/**
 * Returns the locally installed versions and their hashes
 * @returns {Promise<Object>} Map of version name to the contents of its version.txt
 */
export async function buildVersions() {

    const versions = {};
    const entries = await appData.readDir('versions');

    await Promise.all(entries
        .filter(entry => entry.isDirectory)
        .map(async entry => {
            try {
                const hash = await appData.readTextFile(`versions\\${entry.name}\\version.txt`);
                versions[entry.name] = hash.trim();

            } catch {
                // no version.txt, so the directory isn't a usable install
            }
        }));

    return versions;
}
