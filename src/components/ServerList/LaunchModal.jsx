import { invoke, path } from '@tauri-apps/api';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button, Loader, Modal } from 'rsuite';

import { loadFile } from '../../utils/resfile.util';
import { buildVersions, checkVersions, downloadVersion } from '../../utils/update.util';

// ========================================================= //

function LaunchModal({progress, setProgress, selected, password, setRecents}) {

    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');

    const settings = useRef({});

    const isOpen = progress !== '' || error !== '';

    const handleClose = () => {
        setOpen(false);
        setError('');
        setProgress('');
    }

    // --------------------------------------------------------- //

    useEffect(() => {

        const effect = async () => {

            switch(progress) {
                case 'updater': {
                    settings.current = await loadFile('settings.json');
                    setProgress('builds');
                    break;
                }

                case 'builds': {
                    const downloadedVersions = await buildVersions();
                    setProgress(downloadedVersions.hasOwnProperty(selected.version) ? 'launch' : 'check');
                    break;
                }

                case 'check': {
                    try {
                        const vObj = {};
                        vObj[selected.version] = '00000001';

                        const buildsAvailable = await checkVersions(settings.current.updater, vObj);
                        if(buildsAvailable.length === 0) {
                            throw new Error();
                        }

                        setProgress('download');

                    } catch (e) {
                        setError(`Version ${selected.version} is not available locally or on updater!`);
                        setProgress('errored');
                        break;
                    }
                    break;
                }

                case 'download': {
                    try {
                        await downloadVersion(settings.current.updater, selected.version);
                        setProgress('launch');

                    } catch (e) {
                        setError(`Version ${selected.version} could not be downloaded successfully!`);
                        setProgress('errored');
                        break;
                    }
                    break;
                }

                case 'launch': {
                    try {
                        let resDirPath = await path.resourceDir();
                        const [ip, port] = selected.ip.split(":");

                        if(resDirPath.startsWith('\\\\?\\')) {
                            resDirPath = resDirPath.slice(4);
                        }

                        const newRecent = {ip: ip, port: parseInt(port), addedAt: Date.now()};

                        setRecents(p => {

                            if(p.findIndex(v => (v.ip === ip && v.port == port)) === -1) {
                                return [...p, newRecent];
                            } else {
                                return p;
                            }
                        });

                        const commandLine = !selected.password ? `-c -h ${ip} -c -p ${port} -n ${settings.current.playerName}` : `-c -h ${ip} -c -p ${port} -n ${settings.current.playerName} -z ${password}`;
                        await invoke("launch_game", {dllPath: `${resDirPath}versions\\${selected.version}\\vcmp-game.dll`, gameDir: settings.current.gameDir, commandLine: commandLine})
                    } catch (error) {

                        setError(error);
                        setProgress('errored');
                        break;
                    }

                    setProgress('');
                    handleClose();
                    break;
                }
            }
        }

        if(progress !== '' || progress !== 'errored') {
            effect();
        }

    }, [progress, selected])

    // --------------------------------------------------------- //

    const step = useMemo(() => {
        switch(progress) {
            case 'updater':
                return 'Fetching updater settings';
            case 'builds':
                return 'Checking build versions';
            case 'check':
                return `Checking updater`;
            case 'download':
                return `Downloading version ${selected.version}`;
            case 'launch':
                return 'Launching game';
            default: return '';
        }
    }, [progress]);

    // --------------------------------------------------------- //

    return (
        <Modal
            open={isOpen}
            onClose={handleClose}
            backdrop='static'
            keyboard={false}
            className='modalCenter'
        >
            <Modal.Header closeButton={false}>
                <Modal.Title>Launching game</Modal.Title>
            </Modal.Header>

            <Modal.Body className={error.length > 0 ? '' : 'launchModalBody'}>
                {error.length > 0 
                ?   <div className='launchError'>ERR: {error}</div>
                :   <Loader vertical size='md' content={step + '...'} className='launchLoader' /> 
                }
            </Modal.Body>

            {error.length > 0 && 
            <Modal.Footer>
                <Button onClick={handleClose}>
                    Close
                </Button>
            </Modal.Footer>
            }

        </Modal>
    );
}

export default LaunchModal;