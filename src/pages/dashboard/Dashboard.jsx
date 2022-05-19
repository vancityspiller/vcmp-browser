import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IconButton, Container, Content, Header, Loader, Nav, Tag } from 'rsuite';
import ServerList from '../../components/ServerList/ServerList';

import { http } from "@tauri-apps/api";

import { loadFile, saveFile } from '../../utils/resfile.util';
import { performUDP } from '../../utils/server.util';

// ========================================================= //

import ReloadIcon from '@rsuite/icons/legacy/Refresh';
import ExcIcon from '@rsuite/icons/legacy/ExclamationTriangle';

import './dashboard.less';

// --------------------------------------------------------- //

function Dashboard() {

    const [tab, setTab] = useState();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [reload, setReload] = useState(0);

    // read file values
    const [favs, setFavs] = useState([]);
    const [recents, setRecents] = useState([]);

    // server lists
    const [serverList, setServerList] = useState([]);
    const [favList, setFavList] = useState([]);
    const [featuredList, setFeaturedList] = useState([]);
    const [recentList, setRecentList] = useState([]);

    // track initial render
    const isInitialMount = useRef(true);

    // --------------------------------------------------------- //

    const forceReload = useCallback(() => {
        setReload(p => p + 1);
    }, [reload]);

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
            setFailed(false);

            setServerList([]);
            setFeaturedList([]);

            // --------------------------------------------------------- //

            const settingsFile = await loadFile('settings.json');
            const {favorites, history} = await loadFile('servers.json');

            setFavs(favorites); setRecents(history); 

            if(reload === 0) {
                // only change tabs if first render
                setTab(settingsFile.master.defaultTab);
            }
            
            let masterServers, featServers, failed = false;

            try {
                masterServers = await http.fetch(`${settingsFile.master.url}servers`);
                featServers = await http.fetch(`${settingsFile.master.url}official`);    

                if(!masterServers.data.hasOwnProperty('servers') || !featServers.data.hasOwnProperty('servers')) {
                    failed = true;
                    throw new Error();
                }

            } catch (error) {
                failed = true;
                setFailed(true);
            }

            setLoading(false);

            // --------------------------------------------------------- //

            // people want to land on favorites first, and it doesn't depend on masterlist
            if(reload === 0) {
                setFavList([]);

                favorites.forEach(async (v) => {
                    performUDP(v.ip, v.port)
                        .then(async r => {
                            setFavList(p => {
                                return [...p, r];
                            });
                        })
                        .catch();
                });
            }

            if(!failed)
            {
                // featured servers should be much lesser than masterlist, process them first
                featServers.data.servers.forEach(async (v) => {
                    performUDP(v.ip, v.port)
                        .then(async r => {
                            setFeaturedList(p => {
                                return [...p, r];
                            });
                        })
                        .catch();
                });

                masterServers.data.servers.forEach(async (v) => {
                    performUDP(v.ip, v.port)
                        .then(async r => {
                            setServerList(p => {
                                return [...p, r];
                            });
                        })
                        .catch();
                });
            }

            // already taken care after first render
            if(reload !== 0) return;

            setRecentList([]);

            history.forEach(async (v) => {
                performUDP(v.ip, v.port)
                    .then(async r => {

                        r["addedAt"] = v.addedAt;
                        setRecentList(p => {
                            return [...p, r];
                        });
                    })
                    .catch();
            });
        }

        effect();
    }, [reload]);

    // --------------------------------------------------------- //

    useEffect(() => {
        
        if(recents.length === 0) return;

        const effect = async() => {

            let v, fetched;
            if(recents.length > 0) {

                // extract last element
                v = recents.at(-1); 
                fetched = await performUDP(v.ip, v.port);
                fetched["addedAt"] = v.addedAt;
            }

            // carefully check what to add or remove
            setRecentList(p => {

                if(!p) return p;
          
                // its more than likely that there is gonna be more recents if state is changed
                if(p.length < recents.length) {
                    return [...p, fetched];

                } else {
                    return p;
                }
            });

            // save our changes
            const servers = await loadFile('servers.json');
            saveFile('servers.json', {...servers, history: recents});
        }

        if(!isInitialMount) effect();

    }, [recents]);

    // --------------------------------------------------------- //

    useEffect(() => {
      
        const effect = async() => {

            let v, fetched;
            if(favs.length > 0) {

                // extract last element
                v = favs.at(-1); 
                fetched = await performUDP(v.ip, v.port);
            }

            // carefully check what to add or remove
            setFavList(p => {

                if(!p) return p;
          
                if(p.length > favs.length) {

                    return p.filter(v => {
                        const [ip, port] = v.ip.split(':');
                        return favs.findIndex(v2 => {
                            return (v2.ip === ip) && (v2.port === parseInt(port));
                        }) !== -1;
                    })

                } else if(p.length < favs.length) {
                    return [...p, fetched];

                } else {
                    return p;
                }
            });

            // save our changes
            const servers = await loadFile('servers.json');
            saveFile('servers.json', {...servers, favorites: favs});
        }

        if(isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            effect();
        }

    }, [favs]);

    // --------------------------------------------------------- //

    useEffect(() => {

        // register shortcut, Q and E to switch between dashboard tabs
        const listener = event => {
            if(!event.ctrlKey) {

                // it should not work while searching
                if(document.activeElement.nodeName === 'INPUT') return;

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

    const shouldShowFallback = (tab === 'Masterlist' || tab === 'Featured');

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

                {(loading || failed) && shouldShowFallback
                ? 
                    failed  ? <div className='dashFetchError'><ExcIcon className='dashExc'/><h5>Failed to fetch masterlist</h5> <IconButton icon={<ReloadIcon />} onClick={forceReload}>Retry</IconButton></div> 
                            : <Loader className='dashLoader' vertical content='Fetching masterlist...' size='md'/>
                :
                    <Content>
                        { tab === 'Masterlist' && <ServerList list={serverList} updateList={setServerList} favoriteList={favs} changeFavs={setFavs} changeRecents={setRecents} reloadCb={forceReload}/> }
                        { tab === 'Featured' && <ServerList list={featuredList} updateList={setFeaturedList} favoriteList={favs} changeFavs={setFavs} changeRecents={setRecents} reloadCb={forceReload}/> }
                        { tab === 'Recent' && <ServerList list={recentList} updateList={setRecentList} favoriteList={favs} changeFavs={setFavs} changeRecents={setRecents} recentsTab /> }
                        { tab === 'Favorites' && <ServerList list={favList} updateList={setFavList} favoriteList={favs} changeFavs={setFavs} changeRecents={setRecents} favoritesTab /> }
                    </Content>
                }
            </Container>
        </Content>
    );
}

export default Dashboard;