import React, { useState, useEffect } from 'react';
import { Button, Content, Input, InputGroup, InputPicker, Loader, Tooltip } from 'rsuite';
import { loadFile } from '../../utils/resfile.util';

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
]

// ========================================================= //

function Customize() {

    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    // --------------------------------------------------------- //

    useEffect(() => {

        const effect = async () => {

            setLoading(true);

            const settingsFile = await loadFile('settings.json');

            setSettings(settingsFile);
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

                            <Input defaultValue={settings.playerName} className='cszIpt'/>
                        </div>

                        <div className='cszField'>
                            <span>Game Directory:</span> 

                            {fieldsNotSet &&
                            <Tooltip visible className='cszRequired'>
                                Required
                            </Tooltip>
                            }

                            <InputGroup className='cszIpt'>
                                <Input defaultValue={settings.gameDir} readOnly/>
                                <InputGroup.Button 
                                    
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
                            <InputPicker className='cszIpt cszIptP' data={listTabs} defaultValue={settings.master.defaultTab} cleanable={false}/>
                        </div>
                    </div>

                    <div className='cszActions'>
                        <Button appearance='primary'>Save Changes</Button>
                        <Button>Revert</Button>
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