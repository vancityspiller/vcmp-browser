import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Dropdown, Popover } from 'rsuite';
import ReactTimeAgo from 'react-time-ago'

import AddFav from './AddFav';
import PasswordModal from './PasswordModal';
import LaunchModal from './LaunchModal';

import ServerInfoDrawer from '../ServerInfoDrawer/ServerInfoDrawer';

import { clipboard } from '@tauri-apps/api';
import { performUDP } from '../../utils/server.util';

// ========================================================= //

import LockIcon from '@rsuite/icons/legacy/Lock';
import FavoriteIcon from '@rsuite/icons/legacy/Star';
import ExcIcon from '@rsuite/icons/legacy/ExclamationTriangle';

import './serverlist.less';
import Searchbar from './Searchbar';
import ServerlistHeader from './Header';

// --------------------------------------------------------- //

function ServerList({list, updateList, favoriteList, hiddenList, changeFavs, changeHidden, changeRecents, reloadCb, recentsTab, favoritesTab}) {

    const [selected, setSelected] = useState(null);

    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({
        column: favoritesTab || recentsTab ? 'addedAt' : '',
        mode: favoritesTab ? 'des' : (recentsTab ? 'asc' : '')
    });

    const [displayLocked, setDisplayLocked] = useState(true);

    // --------------------------------------------------------- //

    const handleSearch = (value) => {
        setSearch(value);
    }
    
    // --------------------------------------------------------- //

    const rows = useMemo(() => {

        // make a copy of state
        let borrowed = [...list];

        // remove hidden servers
        if(!recentsTab) {
            borrowed = borrowed.filter(v => {
                return (hiddenList.indexOf(v.ip) === -1);
            });
        }

        // show 'Waiting for server data...' on favorites and recents page
        const includeWaiting = favoritesTab || recentsTab;

        if(!includeWaiting) {
            borrowed = borrowed.filter(v => {
                return v.ping !== null;
            });
        } else {
            borrowed = borrowed.map((v) => {
                if(v.ping === null) {
                    return {...v, ping: 9999, serverName: 'Waiting for server data...', gameMode: '', numPlayer: 0, version: '', password: false, isFavorite: false, players: []}
                } else return v;
            });
        }

        // --------------------------------------------------------- //

        // remove locked servers
        if(displayLocked === false) {
            borrowed = borrowed.filter(v => {
                return !v.password;
            });
        }

        // add favorites key; so it can be used later as well
        borrowed = borrowed.map((v) => {

            const fIdx = favoriteList.findIndex(fav => {
                return (fav.ip + ':' + fav.port) === v.ip;
            });

            if(fIdx === -1) {
                return {...v, isFavorite: false};
            }

            if(recentsTab) {
                return {...v, isFavorite: true};
            }

            return {...v, isFavorite: true, addedAt: favoriteList[fIdx].addedAt};
        });

        // search logic
        if(search.trim() !== '') {
            borrowed = borrowed.filter(server => {

                const searchTerm = search.trim().toLowerCase();

                // we search for server name
                if(server.serverName.toLowerCase().indexOf(searchTerm) !== -1)
                    return true;
                
                // we search for server ip
                if(server.ip.toLowerCase().indexOf(searchTerm) !== -1)
                    return true;
                
                let playerSearch = false;
                
                // so why leave players (2261A: stalking is illegal)
                for(let i = 0 ; i < server.players.length ; i++) {
                    if(server.players[i].toLowerCase().indexOf(searchTerm) !== -1) {
                        playerSearch = true;
                        break;
                    }
                }

                if(playerSearch === true) return true;
                return false;
            });
        }

        // --------------------------------------------------------- //

        // sort (default sorted by ping: asc ; because that's how they're received )
        // it doesn't make much sense to sort by name when you can search but doesn't hurt me
        if(sort.mode.length > 0 && sort.column.length > 0) {

            borrowed.sort((a, b) => {

                // get the column data for which we are sorting
                let x = a[sort.column];
                let y = b[sort.column];

                // need to be some sort of integer for comparison
                if(typeof(x) === 'string') {
                    x = x.charCodeAt();
                }

                if(typeof(y) === 'string') {
                    y = y.charCodeAt();
                }
                
                // increasing or decreasing order?
                // less ping is better, so swap for that
                
                if(sort.mode === 'des') {
                    return (sort.column === 'ping' ? y - x :  x - y);
                } else {
                    return (sort.column === 'ping' ? x - y :  y - x);
                }
            });
        }

        return borrowed;
    }, [list, search, sort, favoriteList, hiddenList, displayLocked]);

    const searchPlaceholder = useMemo(() => {

        let players = 0;
        rows.forEach(v => {

            if(v.players)
            players += v.players.length;
        });

        return `Search in ${rows.length} servers and ${players} players`;
    }, [rows]);

    // --------------------------------------------------------- //
    // for drawer

    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleDrawerClose = () => {
        setDrawerOpen(false);
    }

    // --------------------------------------------------------- //

    const handleSelect = useCallback((idx, dontUpdate = false) => {

        const cb = async () => {

            setSelected({...rows[idx]});
            setDrawerOpen(true);

            // if changing via arrow keys, don't update server info or will cause sync issues
            if(dontUpdate) return;

            const rawIndex = list.findIndex(v => {
                return rows[idx].ip === v.ip;
            });

            const current = rows[idx];
    
            const [ip, port] = rows[idx].ip.split(':');
            let newData = await performUDP(ip, parseInt(port));

            if(recentsTab) newData["addedAt"] = current.addedAt;

            if(newData.ping === null)
            newData = {...newData, ping: 9999, serverName: 'Waiting for server data...', gameMode: '', numPlayer: 0, version: '', password: false, isFavorite: false, players: []};
            newData.isFavorite = current.isFavorite;
            
            setSelected(newData);

            updateList(p => {
                const n = [...p];
                n[rawIndex] = newData;
                return n;
            });
    
        };
        cb();

    }, [rows]);

    const handleDirectLaunch = useCallback((idx) => {
        setSelected({...rows[idx]});
        rows[idx]?.password ? actLaunchPassword() : actLaunchRequested();

    }, [selected]);

    // --------------------------------------------------------- //

    const srvList = useRef();

    useEffect(() => {

        // register shortcut, Up and Down arrows to navigate serverlist
        const listener = event => {

            // if a server is selected, use to go to next/previous
            if(drawerOpen && selected) {
                if(!event.ctrlKey) {
                    if(event.key === 'ArrowDown') {
                        const current = rows.findIndex(v => v.ip === selected.ip);

                        if(current === rows.length - 1) return;
                        const next = current + 1;

                        srvList.current.scrollTop += 15;
                        handleSelect(next, true);

                    } else if(event.key === 'ArrowUp') {

                        const current = rows.findIndex(v => v.ip === selected.ip);

                        if(current === 0) return;
                        const next = current - 1;

                        srvList.current.scrollTop -= 15;
                        handleSelect(next, true);
                    }
                }
            }

            // for scrolling
            if(!event.ctrlKey) {
                if(event.key === 'ArrowDown') {
                    const scrollTo = srvList.current.scrollTop + 30;
                    srvList.current.scrollTo({top: scrollTo, behaviour: 'smooth'})

                } else if(event.key === 'ArrowUp') {
                    const scrollTo = srvList.current.scrollTop - 30;
                    srvList.current.scrollTo({top: scrollTo, behaviour: 'smooth'})
                }
            }
        };

        document.addEventListener('keydown', listener);

        // --------------------------------------------------------- //

        const contextListener = () => {

            if(!triggerRef.current) {
                return;
            }

            triggerRef.current.style.opacity = 0;
            triggerRef.current.style["z-index"] = -1;
        }

        document.addEventListener('click', contextListener);

        return () => {
            document.removeEventListener('keydown', listener);
            document.removeEventListener('click', contextListener);
        }
    }, [drawerOpen, selected]);

    // ========================================================= //
    // callbacks for performing actions

    const actHandleFavorite = useCallback(() => {

        if(selected.isFavorite) {
            
            changeFavs(p => {
                return p.filter(v => {
                    return selected.ip !== (v.ip + ':' + v.port);
                })
            })

        } else {

            const [ip, port] = selected.ip.split(':');
            const newFav = {ip: ip, port: parseInt(port), addedAt: Date.now()};

            changeFavs(p => {
                return [...p, newFav];
            });
        }

        selected.isFavorite = !selected.isFavorite;

    }, [selected, changeFavs]);

    // --------------------------------------------------------- //

    const actCopyInfo = useCallback((mode) => {
        
        if(mode === 'ip') {
            clipboard.writeText(selected.ip)
                .catch(() => console.log('ERR: clipboard.writeText failed!'));
        } 

        else if(mode === 'info') {
            clipboard.writeText(`Server Name: ${selected.serverName}\nIP: ${selected.ip}\nGamemode: ${selected.gameMode}\nVersion: ${selected.version}`)
                .catch(() => console.log('ERR: clipboard.writeText failed!'));
        }

    }, [selected]);

    // --------------------------------------------------------- //

    const [passwordModal, setPasswordModal] = useState(false);
    const [enteredPassword, setEnteredPassword] = useState('');
    const [launchProgress, setLaunchProgress] = useState('');
    const buildMode = useRef(false);

    const actLaunchRequested = useCallback(() => {
        setPasswordModal(false);
        setLaunchProgress('updater');
    }, [selected]);

    // --------------------------------------------------------- //

    const actLaunchPassword = useCallback(() => {
        setPasswordModal(true);
    }, [selected]);

    // --------------------------------------------------------- //

    const actHideServer = useCallback(() => {
        
        changeHidden(p => {
            return [...p, selected.ip];;
        });        
    }, [selected]);

    // ========================================================= //

    const triggerRef = useRef();

    const handleContextMenuOpen = (idx, event) => {

        event.preventDefault();
        setSelected({...rows[idx]});

        // set width and make it appear
        triggerRef.current.style.opacity = 100;
        triggerRef.current.style.width = '200px';
        triggerRef.current.style["z-index"] = 1;

        // --------------------------------------------------------- //
        // vertical mapping

        triggerRef.current.style.top = event.clientY + 'px';

        // is the mouse position too low?
        const yDiff = event.view.innerHeight - event.clientY;
        if(yDiff < 300) {
            // then push the toast a bit up
            triggerRef.current.style.top = event.clientY - (300 - yDiff) + 'px';
        }

        // --------------------------------------------------------- //
        // horizontal mapping

        triggerRef.current.style.left = event.clientX + 'px';

        // is the mouse position too right?
        const xDiff = event.view.innerWidth - event.clientX;
        if(xDiff < 200) {
            // then push the toast a bit left ; offset 30px
            triggerRef.current.style.left = event.clientX - (200 - xDiff) - 30 + 'px';
        }
    }

    // ========================================================= //
    
    const handleContextMenuSelect = (key) => {

        switch(key) {
            case 1:
                buildMode.current = false;
                selected?.password ? actLaunchPassword() : actLaunchRequested();
                break;

            case 2: {
                actHandleFavorite();
                break;
            }

            case 3: {
                actCopyInfo('ip');
                break;
            }

            case 4: {
                actCopyInfo('info');
                break;
            }

            case 5: {
                buildMode.current = true;
                selected?.password ? actLaunchPassword() : actLaunchRequested();
                break;
            }

            case 6: {
                actHideServer();
                break;
            }
        }

        triggerRef.current.style.opacity = 0;
    }

    // --------------------------------------------------------- //

    return (
        <React.Fragment>

            <Popover full ref={triggerRef}>
                <Dropdown.Menu
                    onSelect={handleContextMenuSelect}
                >
                    <Dropdown.Item disabled={selected?.ping === 9999} eventKey={1}>Launch</Dropdown.Item>
                    <Dropdown.Item eventKey={2}>{selected?.isFavorite ? 'Remove Favorite' : 'Set Favorite'}</Dropdown.Item>
                    <Dropdown.Item eventKey={3}>Copy IP</Dropdown.Item>
                    <Dropdown.Item disabled={selected?.ping === 9999} eventKey={4}>Copy Info</Dropdown.Item>
                    <Dropdown.Item disabled={selected?.ping === 9999} eventKey={5}>Build Mode</Dropdown.Item>
                    <Dropdown.Item disabled={selected?.isFavorite} eventKey={6}>Hide Server</Dropdown.Item>
                </Dropdown.Menu>
            </Popover>
            
            <ServerlistHeader sort={sort} setSort={setSort} recentsTab={recentsTab} favoritesTab={favoritesTab}/>
            {favoritesTab && <AddFav setFavorites={changeFavs} />}

            {
                rows.length === 0 
                ? 
                    <div className='srvEmptyFallback'>
                        <ExcIcon />
                        <h5>No servers found</h5>
                        <span>{ search.length > 0 ? 'refine your search' : 'might still be loading' }</span>
                    </div>
                :
                <div className='srvList' ref={srvList}>

                    {rows.map((element, idx) => {
                        return (
                            <div 
                                className={`srvItem ${drawerOpen && selected?.ip === element.ip ? 'srvItem-selected' : ''}`} 
                                key={element.ip} 
                                onClick={(e) => {
                                    e.ctrlKey ? handleDirectLaunch(idx) : handleSelect(idx)
                                }}
                                onContextMenu={(event) => handleContextMenuOpen(idx, event)}                                
                            >
                                <span className='srvItemLocked'>{element.password ? <LockIcon /> : ''}</span>

                                <span className='srvItemName'>
                                    {   // add a flair for R2
                                        element.version === '03zR2' &&
                                        <span className='srvItemFlair'>[R2] </span>
                                    }

                                    {element.serverName.length > 55 
                                    ? (element.serverName.slice(0, 55) + '...') 
                                    : element.serverName}
                                </span>
                                <span className='srvItemFav'>{element.isFavorite ? <FavoriteIcon /> : ''}</span>
                                <span className='srvItemPing'>{element.ping}</span>
                                <span className='srvItemPlayers'>{element.numPlayers}<span>/{element.maxPlayers}</span></span>
                                
                                <span className='srvItemMode'>
                                    {recentsTab 
                                        ? <ReactTimeAgo date={element.addedAt} />
                                        : (element.gameMode.length > 20 ? (element.gameMode.slice(0, 20) + '...') : element.gameMode)
                                    }
                                </span>
                            </div>
                        )
                    })}
                </div>
            }
            
            <Searchbar search={search} handleSearch={handleSearch} reloadCb={reloadCb} locked={displayLocked} setLocked={setDisplayLocked} placeholder={searchPlaceholder} />

            <ServerInfoDrawer open={drawerOpen} handleClose={handleDrawerClose} data={selected} handleFavorite={actHandleFavorite} handleCopy={actCopyInfo} handleLaunch={selected?.password ? actLaunchPassword : actLaunchRequested}/>
            <PasswordModal open={passwordModal} setOpen={setPasswordModal} selected={selected} next={actLaunchRequested} password={enteredPassword} setPassword={setEnteredPassword}/>

            <LaunchModal progress={launchProgress} setProgress={setLaunchProgress} selected={selected} password={enteredPassword} setRecents={changeRecents} buildMode={buildMode}/>
                
        </React.Fragment>
    );
}

export default ServerList;