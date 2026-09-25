import { invoke, appDirPath } from '../../api/tauri';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button, Loader, Modal } from 'rsuite';
import { loadFile } from '../../utils/resfile.util';
import { useNavigationLock } from '../../state/navigationLock';
import { buildVersions, downloadVersion } from '../../utils/update.util';

// ========================================================= //

function LaunchModal({progress, setProgress, selected, password, setRecents, buildMode}) {

    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');

    const settings = useRef({});
    const {setLocked} = useNavigationLock();

    // The drawer refreshes a server a second or two after it is opened, so
    // `selected` can change while a launch is already running. The steps read
    // it through this ref, keeping the state machine driven purely by
    // `progress` -- otherwise that refresh re-entered the current step and
    // started a second download on top of the first.
    const server = useRef(selected);
    server.current = selected;

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
                    setLocked(true);
                    settings.current = await loadFile('settings.json');
                    setProgress('builds');
                    break;
                }

                case 'builds': {
                    // skip checking for updater if the server is 0.3z R2
                    if(server.current.version === '03zR2') {
                        setProgress('launch');
                        break;
                    }

                    const downloadedVersions = await buildVersions();
                    setProgress(downloadedVersions.hasOwnProperty(server.current.version) ? 'launch' : 'download');
                    break;
                }

                case 'download': {
                    try {
                        // the updater's /check only compares hashes, it never
                        // reports whether a version exists, so the download is
                        // the only honest availability test
                        await downloadVersion(settings.current.updater, server.current.version);
                        setProgress('launch');

                    } catch (e) {
                        buildMode.current = false;

                        setError(`Could not install version ${server.current.version}: ${e?.message ?? e}`);
                        setProgress('errored');

                        setLocked(false);
                        break;
                    }
                    break;
                }

                case 'launch': {
                    try {
                        const resDirPath = await appDirPath();
                        const [ip, port] = server.current.ip.split(":");

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

                        let commandLine = !server.current.password ? `-c -h ${ip} -c -p ${port} -n ${settings.current.playerName}` : `-c -h ${ip} -c -p ${port} -n ${settings.current.playerName} -z ${password}`;
                        if(buildMode.current) commandLine += ' -d';

                        const isR2 = server.current.version === '03zR2';
                        const pid = await invoke("launch_game", 
                            { 
                                dllPath: isR2 ? '' : `${resDirPath}versions\\${server.current.version}\\${settings.current.isSteam ? 'vcmp-steam.dll' : 'vcmp-game.dll'}`, 
                                gameDir: settings.current.gameDir, 
                                commandLine: commandLine, 
                                isSteam: settings.current.isSteam,
                                isR2: isR2
                            });
                        
                        if(settings.current.richPresence.enabled === true) { 
                            invoke("discord_presence", 
                            {
                                pid: parseInt(pid),
                                ip: server.current.ip,
                                serverName: server.current.serverName,
                                minimal: settings.current.richPresence.minimal,
                                isR2: isR2
                            });
                        }

                    } catch (error) {

                        setError(error);
                        setProgress('errored');
                        setLocked(false);

                        break;
                    }

                    buildMode.current = false;
                    setLocked(false);

                    setProgress('');
                    handleClose();
                    break;
                }
            }
        }

        if(progress !== '' && progress !== 'errored') {
            effect();
        }

        // deliberately not depending on `selected`; see the ref above
    }, [progress])

    // --------------------------------------------------------- //

    const step = useMemo(() => {
        switch(progress) {
            case 'updater':
                return 'Fetching updater settings';
            case 'builds':
                return 'Checking build versions';
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