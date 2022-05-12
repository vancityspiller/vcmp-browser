import React, { useState, useEffect } from 'react';
import { Container, Content, Header, Nav, Tag } from 'rsuite';
import ServerList from '../../components/ServerList/ServerList';

import { http } from "@tauri-apps/api";

import { useSettings } from '../../utils/settings.context';
import { useServers } from '../../utils/config.utils';
import { performUDP } from '../../utils/server.util';

// ========================================================= //

import './dashboard.less';

// --------------------------------------------------------- //

function Dashboard() {

    const {settings} = useSettings();
    const [tab, setTab] = useState(settings.master.defaultTab);

    const [servers] = useServers();

    const [serverList, setServerList] = useState([]);
    const [favList, setFavList] = useState([]);
    const [featuredList, setFeaturedList] = useState([]);
    const [recentList, setRecentList] = useState([]);

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
        http.fetch(`${settings.master.url}servers`)
            .then(response => {
                response.data.servers.forEach(async (v) => {
                    performUDP(v.ip, v.port)
                        .then(r => {
                            setServerList(p => {
                                return [...p, r];
                            });
                        })
                        .catch();
                });
            });
        
        http.fetch(`${settings.master.url}official`)
            .then(response => {
                response.data.servers.forEach(async (v) => {
                    performUDP(v.ip, v.port)
                        .then(r => {
                            setFeaturedList(p => {
                                return [...p, r];
                            });
                        })
                        .catch();
                });
            });
        
    }, []);

    useEffect(() => {

        // don't rerender if on favorites page already, that's to be handled manually
        if(tab !== 'Favorites') {
            servers.favorites.forEach(async (v) => {
                performUDP(v.ip, v.port)
                    .then(r => {
                        setFavList(p => {
                            return [...p, r];
                        });
                    })
                    .catch();
            });
        }

        servers.history.forEach(async (v) => {
            performUDP(v.ip, v.port)
                .then(r => {
                    setRecentList(p => {
                        return [...p, r];
                    });
                })
                .catch();
        });
    }, [servers]);

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
                    { tab ==='Masterlist' && <ServerList list={serverList} includeWaiting={false} /> }
                    { tab ==='Featured' && <ServerList list={featuredList} includeWaiting /> }
                    { tab ==='Recent' && <ServerList list={recentList} includeWaiting /> }
                    { tab ==='Favorites' && <ServerList list={favList} includeWaiting /> }
                </Content>
            </Container>
        </Content>
    );
}

export default Dashboard;