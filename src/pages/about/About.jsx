import { app, shell } from '@tauri-apps/api';
import React, { useState, useEffect } from 'react';
import { Avatar, Content, Tag } from 'rsuite';

// ========================================================= //

import SpiAvatar from './images/avatar_spiller.png';
import OvAvatar from './images/avatar_ov.png';
import DiscordIcon from './images/discord-brands.svg';

import LinkIcon from '@rsuite/icons/legacy/ExternalLinkSquare';
import GhIcon from '@rsuite/icons/legacy/Github';

import './about.less';

// ========================================================= //

function About() {

    const [version, setVersion] = useState();

    // --------------------------------------------------------- //

    useEffect(() => {
        
        const effect = async () => {
            const appVersion = await app.getVersion();
            setVersion(appVersion);        
        }

        effect();

    }, []);

    // --------------------------------------------------------- //

    const openWebsite = async (url) => {
        await shell.open(url);
    }

    // --------------------------------------------------------- //

    return (
        <Content>
            <div className='abtWrapper'>
                <h2 className='abtTitle'>About</h2>
                <span className='abtSubTitle'>vcmp-browser v{version} <span>[tauri]</span></span>

                <div className='abtTeam abtDev'>
                    <Avatar src={SpiAvatar} circle size='lg'/>
                    <div className='abtTeamHolder'>
                        <div className='abtRole'>development</div>
                        <div className='abtName'>Spiller</div>
                    </div>
                </div>

                <div className='abtTeam abtTest'>
                    <Avatar src={OvAvatar} circle size='lg'/>
                    <div className='abtTeamHolder'>
                        <div className='abtRole'>testing</div>
                        <div className='abtName'>OneVice Staff</div>
                    </div>
                </div>

                <div className='abtTeam abtIdea'>
                    <Avatar circle size='lg'>X</Avatar>
                    <div className='abtTeamHolder'>
                        <div className='abtRole'>ideas</div>
                        <div className='abtName'>Xmair</div>
                    </div>
                </div>

                <div className='abtInnerWrapper'>
                    <div className='abtSecHeader'>
                        Contact
                    </div>

                    <Tag className='abtSecInfo' size='lg'>
                        <img src={DiscordIcon} className='abtTagIcon'/> 
                        Spiller<span className='discriminator'>#5285</span>
                    </Tag>

                    <div className='abtPointer' onClick={() => openWebsite('https://github.com/vancityspiller')}>
                        <Tag 
                            className='abtSecInfo' 
                            size='lg'
                        >
                            <GhIcon /> vancityspiller
                        </Tag>
                    </div>

                    <div className='abtSecHeader'>
                        Website
                    </div>

                    <div className='abtPointer' onClick={() => openWebsite('https://onevice.vcmp.net')}>
                        <Tag 
                            className='abtSecInfo' 
                            size='lg'
                        >
                            <LinkIcon /> onevice.vcmp.net
                        </Tag>
                    </div>

                    <div className='abtSecHeader'>
                        Support
                    </div>

                    <div className='abtPointer' onClick={() => openWebsite('https://discord.com/invite/g8dK8DhYSg')}>
                        <Tag 
                            className='abtSecInfo' 
                            size='lg'
                        >
                            <img src={DiscordIcon} className='abtTagIcon'/>
                            <span className='discriminator'>Join</span> OneVice <span className='discriminator'>discord</span>
                        </Tag>
                    </div>
                </div>
            </div>
        </Content>
    );
}

export default About;