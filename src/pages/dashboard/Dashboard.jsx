import React from 'react';
import { Container, Content, Header, Nav, Tag } from 'rsuite';

// ========================================================= //

import './dashboard.less';

// --------------------------------------------------------- //

function Dashboard() {
    return (
        <Content>
            <Container>
                <Header className='dashHeader'>

                    <div className='dashNavWrapper'>
                        <Tag className='dashTag' size='sm'> Q </Tag>
                        <Nav appearance='default' className='dashNav' >
                            <Nav.Item>Favorites</Nav.Item>
                            <Nav.Item>Featured</Nav.Item>
                            <Nav.Item>Masterlist</Nav.Item>
                            <Nav.Item>Recent</Nav.Item>
                        </Nav>
                        <Tag className='dashTag' size='sm'> E </Tag>
                    </div>

                </Header>
            </Container>
        </Content>
    );
}

export default Dashboard;