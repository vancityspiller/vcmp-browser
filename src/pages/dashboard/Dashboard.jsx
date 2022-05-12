import React, { useState, useEffect } from 'react';
import { Container, Content, Header, Nav, Tag } from 'rsuite';
import ServerList from '../../components/ServerList/ServerList';

import { useSettings } from '../../utils/settings.context';

// ========================================================= //

import './dashboard.less';

// --------------------------------------------------------- //

function Dashboard() {

    const {settings} = useSettings();
    const [tab, setTab] = useState(settings.master.defaultTab);

    // --------------------------------------------------------- //

    const handleSelect = (key) => {

        if(tab !== key) {
            setTab(key);
        }
    }

    const isSelected = (key) => {
        return key === tab;
    }

    // --------------------------------------------------------- //

    useEffect(() => {

        // register shortcut, Q and E to switch between dashboard tabs
        const listener = event => {
            if(!event.ctrlKey) {

                let next = '';
                if(event.key === 'q') {
                    switch(tab) {
                        case 'Favorites':   next = 'Recent'; break;
                        case 'Masterlist':  next = 'Favorites'; break;
                        case 'Featured':    next = 'Masterlist'; break;
                        case 'Recent':      next = 'Featured'; break;
                    }

                } else if(event.key === 'e') {
                    switch(tab) {
                        case 'Favorites':   next = 'Masterlist'; break;
                        case 'Masterlist':  next = 'Featured'; break;
                        case 'Featured':    next = 'Recent'; break;
                        case 'Recent':      next = 'Favorites'; break;
                    }
                }

                if(next !== '') {
                    handleSelect(next);
                }
            }
        };

        document.addEventListener('keydown', listener);

        return () => {
            document.removeEventListener('keydown', listener)
        }
    }, [tab]);

    // --------------------------------------------------------- //
    
    return (
        <Content>
            <Container>
                <Header className='dashHeader'>

                    <div className='dashNavWrapper'>
                        <Tag className='dashTag' size='sm'> Q </Tag>
                        <Nav appearance='default' className='dashNav' onSelect={(ek, e) => handleSelect(e.target.outerText)}>
                            <Nav.Item as={'span'} active={isSelected('Favorites')}>Favorites</Nav.Item>
                            <Nav.Item as={'span'} active={isSelected('Masterlist')}>Masterlist</Nav.Item>
                            <Nav.Item as={'span'} active={isSelected('Featured')}>Featured</Nav.Item>
                            <Nav.Item as={'span'} active={isSelected('Recent')}>Recent</Nav.Item>
                        </Nav>
                        <Tag className='dashTag' size='sm'> E </Tag>
                    </div>

                </Header>

                <Content>
                    <ServerList />
                </Content>
            </Container>
        </Content>
    );
}

export default Dashboard;