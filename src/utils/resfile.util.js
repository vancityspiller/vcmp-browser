import { fs, path } from "@tauri-apps/api";

export async function loadFile(fileName) {

    return new Promise((resolve, reject) => {
        path.appDir()
            .then(resDirPath => {
                fs.readTextFile(`${resDirPath}data\\${fileName}`)
                    .then(file => resolve(JSON.parse(file)))
                    .catch(() => reject());
            })
            .catch(() => reject());
    });
}

// ------------------------------------------------------- //

export async function saveFile(fileName, contents) {

    return new Promise((resolve, reject) => {
        path.appDir()
            .then(resDirPath => {
                fs.writeFile({path: `${resDirPath}data\\${fileName}`, contents: JSON.stringify(contents, null, 2)})
                .then(() => resolve())
                .catch(() => reject());
            })
            .catch(() => reject());
    });
}

// ------------------------------------------------------- //