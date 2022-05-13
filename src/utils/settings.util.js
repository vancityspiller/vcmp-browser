import { fs, path } from "@tauri-apps/api";

export async function loadFile(fileName) {

    return new Promise((resolve, reject) => {
        path.resourceDir()
            .then(resDirPath => {
                fs.readTextFile(`${resDirPath}data\\${fileName}`)
                    .then(file => resolve(JSON.parse(file)))
                    .catch(() => reject());
            })
            .catch(() => reject());
    });
}