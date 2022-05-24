import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Dropdown, Input, InputGroup, Popover } from 'rsuite';
import TimeAgo from 'timeago-react';

import AddFav from './AddFav';
import PasswordModal from './PasswordModal';
import LaunchModal from './LaunchModal';

import ServerInfoDrawer from '../ServerInfoDrawer/ServerInfoDrawer';

import { clipboard } from '@tauri-apps/api';
import { performUDP } from '../../utils/server.util';

// ========================================================= //

import ReloadIcon from '@rsuite/icons/legacy/Refresh';
import CloseIcon from '@rsuite/icons/legacy/Close';
import SortDownIcon from '@rsuite/icons/SortDown';
import SortUpIcon from '@rsuite/icons/SortUp';
import LockIcon from '@rsuite/icons/legacy/Lock';
import FavoriteIcon from '@rsuite/icons/legacy/Star';
import ExcIcon from '@rsuite/icons/legacy/ExclamationTriangle';

import './serverlist.less';

// --------------------------------------------------------- //

function ServerList({list, updateList, favoriteList, changeFavs, changeRecents, reloadCb, recentsTab, favoritesTab}) {

    const [selected, setSelected] = useState(null);

    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({
        column: favoritesTab || recentsTab ? 'addedAt' : '',
        mode: favoritesTab ? 'des' : (recentsTab ? 'asc' : '')
    });

    // --------------------------------------------------------- //

    const handleSort = (value) => {

        // if no sort mode set, set this one!
        if(sort.column !== value) {
            setSort({
                column: value,
                mode: 'asc'
            });

        } else {
            if(sort.mode === 'asc') {
                // if mode is ascending, switch it to descending
                setSort({
                    column: value,
                    mode: 'des'
                });
            
            } else {
                // otherwise, unset it
                setSort({
                    column: favoritesTab || recentsTab ? 'addedAt' : '',
                    mode: favoritesTab ? 'des' : (recentsTab ? 'asc' : '')
                });
            }
        }
    };

    const handleSearch = (value) => {
        setSearch(value);
    }

    // --------------------------------------------------------- //

    const isSorted = useCallback((column) => {
        if(column === sort.column) {
            return sort.mode;
        }

        return false;
    }, [sort]);

    function SortedIcon(column) {
        
        const mode = isSorted(column);

        if(mode === 'asc') {
            return <SortDownIcon />
        } else if(mode === 'des') {
            return <SortUpIcon />
        } else {
            return <React.Fragment />
        }
    }
    
    // --------------------------------------------------------- //

    const rows = useMemo(() => {

        // make a copy of state
        let borrowed = [...list];

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
    }, [list, search, sort, favoriteList]);

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

    // ========================================================= //

    const triggerRef = useRef();

    const handleContextMenuOpen = (idx, event) => {

        event.preventDefault();
        setSelected({...rows[idx]});

        triggerRef.current.style.opacity = 100;
        triggerRef.current.style.width = '200px';
        triggerRef.current.style["z-index"] = 1;

        if(event.clientY > srvList.current.clientHeight) {
            triggerRef.current.style.top = (event.clientY - 130 - (event.clientY - srvList.current.clientHeight) + srvList.current.scrollTop) + 'px';
        } else {
            triggerRef.current.style.top = (event.clientY - 130 + srvList.current.scrollTop) + 'px';
        }

        triggerRef.current.style.left = (event.clientX > 800 ? 800 : event.clientX) - 110 + 'px';
    }

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
        }

        triggerRef.current.style.opacity = 0;
    }

    // --------------------------------------------------------- //

    return (
        <React.Fragment>
            <div className='srvHeader'>
                <span 
                    className='srvHeaderName srvHeaderSortable'
                    onClick={() => handleSort('serverName')}
                >
                    Server { SortedIcon('serverName') }
                </span>

                <span 
                    className='srvHeaderPing srvHeaderSortable' 
                    onClick={() => handleSort('ping')}
                >
                    Ping { SortedIcon('ping') }
                </span>

                <span 
                    className='srvHeaderPlayers srvHeaderSortable' 
                    onClick={() => handleSort('numPlayers')}
                >
                    Players { SortedIcon('numPlayers') }
                </span>

                <span className='srvHeaderMode'>{recentsTab ? 'Played At' : 'Gamemode'}</span>
                {favoritesTab && <AddFav setFavorites={changeFavs} />}
            </div>

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

                    <Popover full ref={triggerRef}>
                        <Dropdown.Menu
                            onSelect={handleContextMenuSelect}
                        >
                            <Dropdown.Item disabled={selected?.ping === 9999} eventKey={1}>Launch</Dropdown.Item>
                            <Dropdown.Item eventKey={2}>{selected?.isFavorite ? 'Remove Favorite' : 'Set Favorite'}</Dropdown.Item>
                            <Dropdown.Item eventKey={3}>Copy IP</Dropdown.Item>
                            <Dropdown.Item disabled={selected?.ping === 9999} eventKey={4}>Copy Info</Dropdown.Item>
                            <Dropdown.Item disabled={selected?.ping === 9999} eventKey={5}>Build Mode</Dropdown.Item>
                        </Dropdown.Menu>
                    </Popover>

                    {rows.map((element, idx) => {
                        return (
                            <div 
                                className={`srvItem ${drawerOpen && selected?.ip === element.ip ? 'srvItem-selected' : ''}`} 
                                key={element.ip} 
                                onClick={() => handleSelect(idx)}
                                onContextMenu={(event) => handleContextMenuOpen(idx, event)}                                
                            >
                                <span className='srvItemLocked'>{element.password ? <LockIcon /> : ''}</span>
                                <span className='srvItemName'>
                                    {element.serverName.length > 55 
                                    ? (element.serverName.slice(0, 55) + '...') 
                                    : element.serverName}
                                </span>
                                <span className='srvItemFav'>{element.isFavorite ? <FavoriteIcon /> : ''}</span>
                                <span className='srvItemPing'>{element.ping}</span>
                                <span className='srvItemPlayers'>{element.numPlayers}<span>/{element.maxPlayers}</span></span>
                                
                                <span className='srvItemMode'>
                                    {recentsTab 
                                        ? <TimeAgo datetime={element.addedAt} opts={{minInterval: 15}}/>
                                        : (element.gameMode.length > 20 ? (element.gameMode.slice(0, 20) + '...') : element.gameMode)
                                    }
                                </span>
                            </div>
                        )
                    })}
                </div>
            }
            
            <div className='srvBarWrapper'>
                <InputGroup>
                    { reloadCb !== undefined && 
                        <InputGroup.Button appearance='primary' onClick={reloadCb}>
                            <ReloadIcon />
                        </InputGroup.Button>
                    }

                    <Input 
                        placeholder='Search' 
                        size='md' 
                        value={search}
                        onChange={handleSearch}
                    />

                    <InputGroup.Button appearance='primary' onClick={() => handleSearch('')}>
                        <CloseIcon />
                    </InputGroup.Button>
                </InputGroup>
            </div>

            <ServerInfoDrawer open={drawerOpen} handleClose={handleDrawerClose} data={selected} handleFavorite={actHandleFavorite} handleCopy={actCopyInfo} handleLaunch={selected?.password ? actLaunchPassword : actLaunchRequested}/>
            <PasswordModal open={passwordModal} setOpen={setPasswordModal} selected={selected} next={actLaunchRequested} password={enteredPassword} setPassword={setEnteredPassword}/>

            <LaunchModal progress={launchProgress} setProgress={setLaunchProgress} selected={selected} password={enteredPassword} setRecents={changeRecents} buildMode={buildMode}/>
                
        </React.Fragment>
    );
}

export default ServerList;