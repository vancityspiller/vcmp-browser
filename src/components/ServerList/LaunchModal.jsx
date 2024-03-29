import { invoke, path } from '@tauri-apps/api';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button, Loader, Modal } from 'rsuite';
import { downloadFiles } from '../../utils/httpd.utils';

import { loadFile } from '../../utils/resfile.util';
import { buildVersions, checkVersions, downloadVersion } from '../../utils/update.util';

// ========================================================= //

function LaunchModal({progress, setProgress, selected, password, setRecents, buildMode}) {

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
                    localStorage.setItem('navSwitching', 'false');
                    settings.current = await loadFile('settings.json');
                    setProgress('builds');
                    break;
                }

                case 'builds': {
                    // skip checking for updater if the server is 0.3z R2
                    if(selected.version === '03zR2') {
                        setProgress('launch');
                        break;
                    }

                    const downloadedVersions = await buildVersions();
                    setProgress(downloadedVersions.hasOwnProperty(selected.version) ? 'httpd' : 'check');
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
                        buildMode.current = false;

                        setError(`Version ${selected.version} is not available locally or on updater!`);
                        setProgress('errored');

                        localStorage.setItem('navSwitching', 'true');
                        break;
                    }
                    break;
                }

                case 'download': {
                    try {
                        await downloadVersion(settings.current.updater, selected.version);
                        setProgress('httpd');

                    } catch (e) {
                        buildMode.current = false;

                        setError(`Version ${selected.version} could not be downloaded successfully!`);
                        setProgress('errored');

                        localStorage.setItem('navSwitching', 'true');
                        break;
                    }
                    break;
                }

                case 'httpd': {
                    if(settings.current.httpDownloads) {
                        await downloadFiles(selected.ip);
                    }
                    
                    setProgress('launch');
                    break;
                }

                case 'launch': {
                    try {
                        let resDirPath = await path.appDataDir();
                        const [ip, port] = selected.ip.split(":");

                        if(resDirPath.startsWith('\\\\?\\')) {
                            resDirPath = resDirPath.slice(4);
                        }

                        const newRecent = {ip: ip, port: parseInt(port), addedAt: Date.now()};

                        setRecents(p => {

                            const found = p.findIndex(v => (v.ip === ip && v.port === parseInt(port)));
                            if(found === -1) {
                                return [...p, newRecent];

                            } else {
                                
                                const n = [...p];
                                n[found] = newRecent;
                                return n;
                            }
                        });

                        let commandLine = !selected.password ? `-c -h ${ip} -c -p ${port} -n ${settings.current.playerName}` : `-c -h ${ip} -c -p ${port} -n ${settings.current.playerName} -z ${password}`;
                        if(buildMode.current) commandLine += ' -d';

                        const isR2 = selected.version === '03zR2';
                        const pid = await invoke("launch_game", 
                            { 
                                dllPath: isR2 ? '' : `${resDirPath}versions\\${selected.version}\\${settings.current.isSteam ? 'vcmp-steam.dll' : 'vcmp-game.dll'}`, 
                                gameDir: settings.current.gameDir, 
                                commandLine: commandLine, 
                                isSteam: settings.current.isSteam,
                                isR2: isR2
                            });
                        
                        if(settings.current.richPresence.enabled === true) { 
                            invoke("discord_presence", 
                            {
                                pid: parseInt(pid), 
                                ip: selected.ip, 
                                sendString: `VCMP${ip.slice(0, 4)}${port.toString().slice(0, 2)}i`, 
                                serverName: selected.serverName, 
                                minimal: settings.current.richPresence.minimal,
                                isR2: isR2
                            });
                        }

                    } catch (error) {

                        setError(error);
                        setProgress('errored');
                        localStorage.setItem('navSwitching', 'true');

                        break;
                    }

                    buildMode.current = false;
                    localStorage.setItem('navSwitching', 'true');

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
            case 'httpd':
                return 'Downloading server store files';
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