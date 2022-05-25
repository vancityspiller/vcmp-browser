import { fs, invoke, path } from "@tauri-apps/api";

// ======================================================= //

export function downloadFiles(serverIp, force = false) {

    return new Promise(async resolve => {

        const fileList = JSON.parse(localStorage.getItem('httpd'));

        // does it have any links
        if(fileList.length === 0) {
            resolve();
            return;
        }

        // does it have what we need
        const found = fileList.findIndex(v => v.ip === serverIp);
        if(found === -1) {
            resolve();
            return;
        }

        // check if files already exists
        const appDataPath = await path.dataDir();

        try {
            const serverEntries = await fs.readDir(`${appDataPath}VCMP\\04beta\\store`);
            const [ip, port] = serverIp.split(':');

            if(serverEntries.findIndex(v => v.name === `${ip}-${port}`) !== -1) {
                if(!force) {
                    resolve();
                    return;
                }
            }

            await invoke('downloadFiles', {url: fileList[found].url, path: `${appDataPath.startsWith('\\\\?\\') ? appDataPath.slice(4) : appDataPath}VCMP\\04beta\\store\\${ip}-${port}\\`});
            await invoke('extract7z', {path: `${appDataPath}VCMP\\04beta\\store\\${ip}-${port}\\files.7z`, dest: `${appDataPath}VCMP\\04beta\\store\\${ip}-${port}\\`});
        
        } catch (e) {
            resolve();
            return;
        }

        resolve();
    });
}