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
    const [favs, setFavs] = useState(null);
    const [hiddens, setHidden] = useState(null);
    const [recents, setRecents] = useState(null);

    // server lists
    const [serverList, setServerList] = useState([]);
    const [favList, setFavList] = useState([]);
    const [featuredList, setFeaturedList] = useState([]);
    const [recentList, setRecentList] = useState([]);

    // track renders
    const isInitialMountFav = useRef(true);
    const isInitialMountRec = useRef(true);

    const isFinalUnmount = useRef(false);
    const lastUpdate = useRef(Date.now());

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
        return () => {

            if(!isFinalUnmount.current) {
                isFinalUnmount.current = true;
            }
        }
    }, []);

    useEffect(() => {

            return () => {

                if(!isFinalUnmount.current) return;              

                // do we even have anything to save?
                if(serverList.length === 0) return;

                // check if the last update in serverlists was recent
                if(Date.now() - lastUpdate.current < 1500) return;
    
                const storeObj = {
                    favs: favs,
                    hiddens: hiddens,
                    recents: recents,
                    serverList: serverList,
                    favList: favList,
                    featuredList: featuredList,
                    recentList: recentList
                };
    
                localStorage.setItem('servers', JSON.stringify(storeObj));
            }
        
    }, [favs, recents, hiddens, serverList, favList, featuredList, recentList]);

    // --------------------------------------------------------- //

    useEffect(() => {

        const effect = async () => {
            setLoading(true);
            setFailed(false);

            setServerList([]);
            setFeaturedList([]);

            // --------------------------------------------------------- //
            
            const settingsFile = await loadFile('settings.json');

            if(reload === 0) {
                
                const storedData = localStorage.getItem('servers');
                const storedTab = localStorage.getItem('lastTab');
                
                // set the tab to last opened one or default if not available
                setTab(storedTab === null ? settingsFile.master.defaultTab : storedTab);

                if(storedData !== null) {
                    const storedServers = JSON.parse(storedData);
                    
                    setFavs(storedServers.favs);
                    setHidden(storedServers.hiddens);
                    setRecents(storedServers.recents);
                    
                    setServerList(storedServers.serverList);
                    setFeaturedList(storedServers.featuredList);
                    setRecentList(storedServers.recentList);
                    setFavList(storedServers.favList);
                    
                    setLoading(false);
                    return;
                }
            }

            // --------------------------------------------------------- //

            const {favorites, history, hidden} = await loadFile('servers.json');
            setFavs(favorites); setRecents(history); setHidden(hidden);

            let masterServers, featServers, failed = false;

            try {
                masterServers = await http.fetch(`${settingsFile.master.url}servers`);

                const featuredUrl = settingsFile.master.useLegacy ? `${settingsFile.master.url}official` : 'https://v4.vcmp.net/featured';
                featServers = await http.fetch(featuredUrl);    

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

                            lastUpdate.current = Date.now();

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

                            lastUpdate.current = Date.now();

                            setFeaturedList(p => {
                                return [...p, r];
                            });
                        })
                        .catch();
                });

                masterServers.data.servers.forEach(async (v) => {
                    performUDP(v.ip, v.port)
                        .then(async r => {

                            lastUpdate.current = Date.now();

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

                        lastUpdate.current = Date.now();

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
        
        if(recents === null) return;

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

                } else if(recents.length === 0) {
                    return p;
                } else {

                    const n = [...p];

                    // if its the same number, check if something has changed
                    recents.forEach(r => {
                        const at = n.findIndex(v1 => {
                            const [ip, port] = v1.ip.split(':');
                            return r.ip === ip && r.port === parseInt(port);
                        });

                        n[at].addedAt = r.addedAt;
                    });

                    return n;
                }
            });

            // save our changes
            const servers = await loadFile('servers.json');
            saveFile('servers.json', {...servers, history: recents});
        }

        if(isInitialMountRec.current) {
            isInitialMountRec.current = false;
        } else {
            effect();
        }

    }, [recents]);

    // --------------------------------------------------------- //

    useEffect(() => {

        if(favs === null) return;
      
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

        if(isInitialMountFav.current) {
            isInitialMountFav.current = false;
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

        // save the current tab to restore it later on
        if(tab) localStorage.setItem('lastTab', tab);

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
                        { tab === 'Masterlist' && <ServerList list={serverList} updateList={setServerList} hiddenList={hiddens} favoriteList={favs} changeFavs={setFavs} changeRecents={setRecents} reloadCb={forceReload}/> }
                        { tab === 'Featured' && <ServerList list={featuredList} updateList={setFeaturedList} hiddenList={hiddens} favoriteList={favs} changeFavs={setFavs} changeRecents={setRecents} reloadCb={forceReload}/> }
                        { tab === 'Recent' && <ServerList list={recentList} updateList={setRecentList} hiddenList={hiddens} favoriteList={favs} changeFavs={setFavs} changeRecents={setRecents} recentsTab /> }
                        { tab === 'Favorites' && <ServerList list={favList} updateList={setFavList} hiddenList={hiddens} favoriteList={favs} changeFavs={setFavs} changeRecents={setRecents} favoritesTab /> }
                    </Content>
                }
            </Container>
        </Content>
    );
}

export default Dashboard;