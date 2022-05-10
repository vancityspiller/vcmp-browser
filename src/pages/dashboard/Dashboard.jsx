import React, { useState } from 'react';
import { Container, Content, Header, Nav, Tag } from 'rsuite';
import ServerList from '../../components/ServerList/ServerList';

import { useSettings } from '../../utils/settings.context';

// ========================================================= //

// --------------------------------------------------------- //

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
    
    return (
        <Content>
            <Container>
                <Header className='dashHeader'>

                    <div className='dashNavWrapper'>
                        <Tag className='dashTag' size='sm'> Q </Tag>
                        <Nav appearance='default' className='dashNav' onSelect={(ek, e) => handleSelect(e.target.outerText)}>
                            <Nav.Item as={'span'} active={isSelected('Favorites')}>Favorites</Nav.Item>
                            <Nav.Item as={'span'} active={isSelected('Featured')}>Featured</Nav.Item>
                            <Nav.Item as={'span'} active={isSelected('Masterlist')}>Masterlist</Nav.Item>
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