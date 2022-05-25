import React, { useState, useEffect } from 'react';
import { Button, Content, Input, InputPicker, Loader, Toggle } from 'rsuite';

import { loadFile, saveFile } from '../../utils/resfile.util';

import './settings.less';

// ========================================================= //

const listUpdaters = [
    {
        "label": "v4.vcmp.net",
        "value": "https://v4.vcmp.net/updater/"
    },
    {
        "label": "Official Updater",
        "value": "https://u04.vc-mp.org/"
    },
    {
        "label": "u04.thijn.ovh",
        "value": "https://u04.thijn.ovh/"
    }
];

const listMasters = [
    {
        "label": "Official Masterlist",
        "value": "http://master.vc-mp.org/"
    },
    {
        "label": "master.thijn.ovh",
        "value": "https://master.thijn.ovh/"
    }
];

const defaultValues = {
    masterUrl: "http://master.vc-mp.org/",
    useLegacy: false,
    updaterUrl: "https://v4.vcmp.net/updater/",
    checkOnStartup: true,
    httpDownloads: true
};

// ========================================================= //

function Settings({setUpdate}) {

    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    
    const [saveEnabled, setSaveEnabled] = useState(false);
    const [inputState, setInputState] = useState({});

    // --------------------------------------------------------- //

    const handleInputChange = (type, value) => {

        let enableSave = saveEnabled;

        if(type === 'masterurl') {

            if(value !== settings.master.url) {
                enableSave = true;
            }

            setInputState(p => {
                const n = {...p};
                n.masterUrl = value;
                return n;
            });

        } else if (type === 'legacy') {
            if(value !== settings.master.useLegacy) {
                enableSave = true;
            }

            setInputState(p => {
                const n = {...p};
                n.useLegacy = value;
                return n;
            });
        } else if (type === 'updaterurl') {
            if(value !== settings.updater.url) {
                enableSave = true;
            }

            setInputState(p => {
                const n = {...p};
                n.updaterUrl = value;
                return n;
            });
        } else if (type === 'checkupdates') {
            if(value !== settings.updater.checkOnStartup) {
                enableSave = true;
            }

            setInputState(p => {
                const n = {...p};
                n.checkOnStartup = value;
                return n;
            });
        } else if(type === 'httpd') {
            if(value !== settings.httpDownloads) {
                enableSave = true;
            }

            setInputState(p => {
                const n = {...p};
                n.httpDownloads = value;
                return n;
            });
        }

        setSaveEnabled(enableSave);
    }

    // ========================================================= //

    useEffect(() => {

        const effect = async () => {

            setLoading(true);

            const settingsFile = await loadFile('settings.json');

            setSettings({...settingsFile});
            setInputState({
                masterUrl: settingsFile.master.url,
                useLegacy: settingsFile.master.useLegacy,
                updaterUrl: settingsFile.updater.url,
                checkOnStartup: settingsFile.updater.checkOnStartup,
                httpDownloads: settingsFile.httpDownloads
            });

            setLoading(false);
        }

        effect();
        
    }, []);

    // --------------------------------------------------------- //

    const handleSave = () => {

        const n = {...settings};
        n.master.url = inputState.masterUrl;
        n.master.useLegacy = inputState.useLegacy;
        n.updater.url = inputState.updaterUrl;
        n.updater.checkOnStartup = inputState.checkOnStartup;
        n.httpDownloads = inputState.httpDownloads;

        saveFile('settings.json', n);
        setSaveEnabled(false);
        setSettings(n);
    }

    const handleRevert = () => {

        setSaveEnabled(false);
        setInputState({
            masterUrl: settings.master.url,
            useLegacy: settings.master.useLegacy,
            updaterUrl: settings.updater.url,
            checkOnStartup: settings.updater.checkOnStartup,
            httpDownloads: settings.httpDownloads
        });
    }

    // --------------------------------------------------------- //

    const handleRestore = () => {
        
        setInputState({...defaultValues});

        const n = {...settings};
        n.master.url = defaultValues.masterUrl;
        n.master.useLegacy = defaultValues.useLegacy;
        n.updater.url = defaultValues.updaterUrl;
        n.updater.checkOnStartup = defaultValues.checkOnStartup;
        n.httpDownloads = defaultValues.httpDownloads;

        saveFile('settings.json', n);
        setSaveEnabled(false);
        setSettings(n);
    }

    // --------------------------------------------------------- //

    if(loading) {
        return (
            <Content>
                <Loader className='sttLoader' vertical size='lg'/>
            </Content>
        );
    }

    // --------------------------------------------------------- //

    return (
        <React.Fragment>
            <Content>
                <div className='sttWrapper'>
                    <h2 className='sttTitle'>Settings</h2>

                    <div>
                        <h6 className='sttSecHeader'>Updater</h6>

                        <div className='sttField'>
                            <span>URL:</span>

                            <InputPicker 
                                className='sttIpt sttIptP' 
                                data={listUpdaters} 
                                value={inputState.updaterUrl} 
                                cleanable={false}
                                onChange={(value) => handleInputChange('updaterurl', value)}
                            />
                        </div>

                        <div className='sttField sttFieldRight'>
                            <span>Password:</span>

                            <Input
                                className='sttIpt' 
                                placeholder='Currently obsolete'
                                disabled
                            />
                        </div>

                        <div className='sttField sttFieldRight sttFieldRightBottom'>
                            <span>Enable HTTP downloads:</span>

                            <Toggle 
                                className='sttIptT'
                                checked={inputState.httpDownloads}
                                onChange={(value) => handleInputChange('httpd', value)}
                            />
                        </div>

                        <div className='sttField sttFieldMargin'>
                            <span>Check for updates on startup:</span>
                            <Toggle 
                                className='sttIptT'
                                checked={inputState.checkOnStartup}
                                onChange={(value) => handleInputChange('checkupdates', value)}
                            />
                        </div>
                    </div>

                    <div>
                        <h6 className='sttSecHeader'>Masterlist</h6>

                        <div className='sttField'>
                            <span>URL:</span>

                            <InputPicker 
                                className='sttIpt sttIptP' 
                                data={listMasters} 
                                value={inputState.masterUrl} 
                                cleanable={false}
                                onChange={(value) => handleInputChange('masterurl', value)}
                            />
                        </div>

                        <div className='sttField sttFieldMargin'>
                            <span>Use legacy featured list:</span>
                            <Toggle 
                                className='sttIptT'
                                checked={inputState.useLegacy}
                                onChange={(value) => handleInputChange('legacy', value)}
                            />
                        </div>
                    </div>

                    <div className='sttActions'>

                        <Button 
                            appearance='primary' 
                            disabled={!saveEnabled}
                            onClick={handleSave}
                        >
                            Save Changes
                        </Button>

                        <Button onClick={handleRevert}>Revert</Button>
                    </div>

                    <div className='sttActionsRight'>

                        <Button onClick={() => setUpdate(p => p + 1)}>
                            Check for updates
                        </Button>

                        <Button onClick={handleRestore}>Restore Defaults</Button>
                    </div>
                </div>
                
            </Content>
        </React.Fragment>
    );
}

export default Settings;