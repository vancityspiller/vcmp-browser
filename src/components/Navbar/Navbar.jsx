import React, { useEffect } from 'react';

import { Sidebar } from 'rsuite';
import { appWindow } from '@tauri-apps/api/window';

import CustomIcon from './CustomIcon';

import './navbar.less';

// ========================================================= //
// Icons taken from FontAwesome

import DashIcon from './icons/server-solid.svg';
import SettingsIcon from './icons/gear-solid.svg';
import CustIcon from './icons/brush-solid.svg';
import AboutIcon from './icons/circle-info-solid.svg';

import CloseIcon from './icons/circle-xmark-solid.svg';
import Logo from './icons/logo.png';

// --------------------------------------------------------- //

const iconList = [
    {
        title: 'Dashboard',
        icon: DashIcon
    },
    {
        title: 'Customize',
        icon: CustIcon
    },
    {
        title: 'Settings',
        icon: SettingsIcon
    },
    {
        title: 'About',
        icon: AboutIcon
    }
];

// ========================================================= //


function SideNavbar({address, setAddress}) {

    const isSelected = (title) => {
        return title === address;
    }

    const clickCb = (title) => {

        if(title !== address)
        setAddress(title);
    }

    // --------------------------------------------------------- //

    useEffect(() => {

        // register shortcut, Ctrl + Up/Down Arrow to switch between menus
        const listener = event => {

            if(event.ctrlKey) {
                if(event.key === 'ArrowDown') {
                    const current = iconList.findIndex(v => v.title === address);
                    const next = current === (iconList.length - 1) ? 0 : current + 1;

                    clickCb(iconList[next].title);
                } else if(event.key === 'ArrowUp') {

                    const current = iconList.findIndex(v => v.title === address);
                    const next = current === 0 ? (iconList.length - 1) : current - 1;

                    clickCb(iconList[next].title);
                }
            }
        };

        document.addEventListener('keydown', listener);

        return () => {
            document.removeEventListener('keydown', listener)
        }
    }, [address]);
    
    // --------------------------------------------------------- //

    return (
        <React.Fragment>
            <Sidebar className='sidebar' width={80}>

                <img className='nvLogo' src={Logo} />

                <div className='nvWrapper'>
                    {
                        iconList.map(element => {
                            return <CustomIcon key={element.title} title={element.title} icon={element.icon} clickCb={() => clickCb(element.title)} selected={isSelected(element.title)} />
                        })
                    }
                </div>

                <CustomIcon title={'Exit'} icon={CloseIcon} exClass='nvClose' clickCb={() => appWindow.close()} />
            </Sidebar>
        </React.Fragment>
    );
}

export default SideNavbar;