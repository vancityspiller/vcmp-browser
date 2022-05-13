import React, { useState, useEffect } from 'react';
import { Container, Content, Header, Nav, Tag } from 'rsuite';
import ServerList from '../../components/ServerList/ServerList';

import { http } from "@tauri-apps/api";

import { loadFile } from '../../utils/settings.util';
import { performUDP } from '../../utils/server.util';

// ========================================================= //

import './dashboard.less';

// --------------------------------------------------------- //

function Dashboard() {

    const [tab, setTab] = useState();
    const [loading, setLoading] = useState(true);

    // read file values
    const [favs, setFavs] = useState([]);
    const [recents, setRecents] = useState([]);

    // server lists
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

        const effect = async () => {
            setLoading(true);

            const settingsFile = await loadFile('settings.json');
            const {favorites, history} = await loadFile('servers.json');

            setFavs(favorites); setRecents(history); setTab(settingsFile.master.defaultTab);

            const masterServers = await http.fetch(`${settingsFile.master.url}servers`);
            const featServers = await http.fetch(`${settingsFile.master.url}official`);
            setLoading(false);

            // --------------------------------------------------------- //

            masterServers.data.servers.forEach(async (v) => {
                performUDP(v.ip, v.port)
                    .then(r => {
                        setServerList(p => {
                            return [...p, r];
                        });
                    })
                    .catch();
            });
            
            featServers.data.servers.forEach(async (v) => {
                performUDP(v.ip, v.port)
                    .then(r => {
                        setFeaturedList(p => {
                            return [...p, r];
                        });
                    })
                    .catch();
            });

            favs.forEach(async (v) => {
                performUDP(v.ip, v.port)
                    .then(r => {
                        setFavList(p => {
                            return [...p, r];
                        });
                    })
                    .catch();
            });

            recents.forEach(async (v) => {
                performUDP(v.ip, v.port)
                    .then(r => {
                        setRecentList(p => {
                            return [...p, r];
                        });
                    })
                    .catch();
            });
        }

        effect();        
    }, []);

    // --------------------------------------------------------- //

    useEffect(() => {
        
        // carefully check what to add or remove
        if(favList.length > favs.length) {
            setFavList(p => {
                return p.filter(v => {
                    const [ip, port] = v.ip.split(':');
                    return favs.findIndex(v2 => {
                        return (v2.ip === ip) && (v2.port === parseInt(port));
                    }) !== -1;
                })
            })

        } else if(favList.length < favs.length) {

            const v = favs.at(-1);
            performUDP(v.ip, v.port)
                .then(r => {
                    setFavList(p => {
                        return [...p, r];
                    });
                })
                .catch();
        }

    }, [favs]);

    // --------------------------------------------------------- //

    useEffect(() => {

        if(recents.length === 0) return;

        // its more than likely that there is gonna be more recents if state is changed
        const v = recents.at(-1);
        performUDP(v.ip, v.port)
            .then(r => {
                setRecentList(p => {
                    return [...p, r];
                });
            })
            .catch();

    }, [recents]);

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

                {!loading &&
                    <Content>
                        { tab ==='Masterlist' && <ServerList list={serverList} favoriteList={favs} changeFavs={setFavs} includeWaiting={false} /> }
                        { tab ==='Featured' && <ServerList list={featuredList} favoriteList={favs} changeFavs={setFavs} includeWaiting={false} /> }
                        { tab ==='Recent' && <ServerList list={recentList} favoriteList={favs} changeFavs={setFavs} includeWaiting /> }
                        { tab ==='Favorites' && <ServerList list={favList} favoriteList={favs} changeFavs={setFavs} includeWaiting /> }
                    </Content>
                }
            </Container>
        </Content>
    );
}

export default Dashboard;