import React, { useState, useEffect } from 'react';
import { Button, Content, Input, InputGroup, InputPicker, Loader, Tooltip } from 'rsuite';
import { dialog } from '@tauri-apps/api';

import { loadFile, saveFile } from '../../utils/resfile.util';

import OpenIcon from '@rsuite/icons/legacy/FolderOpen';
import './customize.less';

// ========================================================= //

const listTabs = [
    {
        "label": "Masterlist",
        "value": "Masterlist"
    },
    {
        "label": "Favorites",
        "value": "Favorites"
    },
    {
        "label": "Featured",
        "value": "Featured"
    },
    {
        "label": "Recent",
        "value": "Recent"
    }
];

// ========================================================= //

function Customize() {

    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    
    const [saveEnabled, setSaveEnabled] = useState(false);
    const [inputState, setInputState] = useState({});

    // --------------------------------------------------------- //

    const handleInputChange = (type, value) => {

        let enableSave = false;

        if(type === 'gamedir') {

            if(value !== settings.gameDir) {
                enableSave = true;
            }

            setInputState(p => {
                const n = {...p};
                n.gameDir = value;
                return n;
            });

        } else if (type === 'playername') {
            value = value.trim();

            if (value.length > 24) {
                return;
            }

            if(value !== settings.playerName && value.length > 0) {
                enableSave = true;
            }

            setInputState(p => {
                const n = {...p};
                n.playerName = value;
                return n;
            });
        } else if (type === 'defaulttab') {
            if(value !== settings.master.defaultTab) {
                enableSave = true;
            }

            setInputState(p => {
                const n = {...p};
                n.defaultTab = value;
                return n;
            });
        }

        setSaveEnabled(enableSave);
    }

    // --------------------------------------------------------- //

    const handleSave = () => {

        const n = {...settings};
        n.playerName = inputState.playerName;
        n.gameDir = inputState.gameDir;
        n.master.defaultTab = inputState.defaultTab;

        if((settings.playerName === '' || settings.gameDir === '') && (n.playerName !== '' && n.gameDir !== '')) {
            localStorage.setItem('navSwitching', 'true');
        }

        saveFile('settings.json', n);
        setSaveEnabled(false);
        setSettings(n);
    }

    const handleRevert = () => {

        setSaveEnabled(false);
        setInputState({
            playerName: settings.playerName,
            gameDir: settings.gameDir,
            defaultTab: settings.master.defaultTab
        });
    }

    const selectGameDir = () => {
        dialog.open({
            directory: false,
            multiple: false,
            defaultPath: settings.gameDir ? settings.gameDir : undefined,
            title: 'Locate gta-vc.exe...',
            filters: [
                {
                    extensions: ['exe'],
                    name: 'gta-vc.exe'
                }
            ]
        })
        .then(gamePath => {
            if(gamePath) {
                if(gamePath.endsWith('\\gta-vc.exe')) 
                handleInputChange('gamedir', gamePath.slice(0, gamePath.length - 11));
            }
        })
        .catch(() => {});
    }

    // ========================================================= //

    useEffect(() => {

        const effect = async () => {

            setLoading(true);

            const settingsFile = await loadFile('settings.json');

            setSettings({...settingsFile});
            setInputState({
                playerName: settingsFile.playerName,
                gameDir: settingsFile.gameDir,
                defaultTab: settingsFile.master.defaultTab
            });

            setLoading(false);
        }

        effect();
        
    }, []);

    // --------------------------------------------------------- //

    if(loading) {
        return (
            <Content>
                <Loader className='cszLoader' vertical size='lg'/>
            </Content>
        );
    }

    const fieldsNotSet = settings.gameDir.length === 0 || settings.playerName.length === 0;

    // --------------------------------------------------------- //

    return (
        <React.Fragment>
            <Content>
                <div className='cszWrapper'>
                    <h2 className='cszTitle'>Customize</h2>

                    <div>
                        <h6 className='cszSecHeader'>Vice City</h6>

                        <div className='cszField'>
                            <span>Nickname:</span>

                            {fieldsNotSet &&
                            <Tooltip visible className='cszRequired'>
                                Required
                            </Tooltip>
                            }

                            <Input
                                value={inputState.playerName} 
                                className='cszIpt'
                                onChange={(value) => handleInputChange('playername', value)}
                            />
                        </div>

                        <div className='cszField'>
                            <span>Game Directory:</span> 

                            {fieldsNotSet &&
                            <Tooltip visible className='cszRequired'>
                                Required
                            </Tooltip>
                            }

                            <InputGroup className='cszIpt'>
                                <Input value={inputState.gameDir} readOnly/>
                                <InputGroup.Button 
                                    onClick={selectGameDir}
                                >
                                    <OpenIcon />
                                </InputGroup.Button>
                            </InputGroup>
                        </div>
                    </div>

                    <div>
                        <h6 className='cszSecHeader'>Browser</h6>

                        <div className='cszField'>
                            <span>Default dashboard tab:</span>
                            <InputPicker 
                                className='cszIpt cszIptP' 
                                data={listTabs} 
                                value={inputState.defaultTab} 
                                cleanable={false}
                                onChange={(value) => handleInputChange('defaulttab', value)}
                            />
                        </div>
                    </div>

                    <div className='cszActions'>

                        <Button 
                            appearance='primary' 
                            disabled={!saveEnabled}
                            onClick={handleSave}
                        >
                            Save Changes
                        </Button>

                        <Button onClick={handleRevert}>Revert</Button>
                    </div>
                </div>

                {fieldsNotSet && 
                    <div className='cszFooter'>
                        Game directory or Nickname not set!
                    </div>
                }
                
            </Content>
        </React.Fragment>
    );
}

export default Customize;