import React, { useMemo } from 'react';

import { Sidebar } from 'rsuite';
import CustomIcon from './CustomIcon';

import './navbar.less';

// ========================================================= //

import DashIcon from './icons/server-solid.svg';
import SettingsIcon from './icons/gear-solid.svg';
import CustIcon from './icons/brush-solid.svg';
import AboutIcon from './icons/circle-info-solid.svg';

const iconList = [
    {
        title: 'Dashboard',
        icon: DashIcon
    },
    {
        title: 'Settings',
        icon: SettingsIcon
    },
    {
        title: 'Customize',
        icon: CustIcon
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

    return (
        <React.Fragment>
            <Sidebar className='sidebar' width={80}>
                <div className='nvWrapper'>
                    {
                        iconList.map(element => {
                            return <CustomIcon key={element.title} title={element.title} icon={element.icon} clickCb={() => clickCb(element.title)} selected={isSelected(element.title)} />
                        })
                    }
                </div>
            </Sidebar>
        </React.Fragment>
    );
}

export default SideNavbar;