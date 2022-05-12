import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Input, InputGroup } from 'rsuite';

import ServerInfoDrawer from '../ServerInfoDrawer/ServerInfoDrawer';

// ========================================================= //

import ReloadIcon from '@rsuite/icons/legacy/Refresh';
import CloseIcon from '@rsuite/icons/legacy/Close';
import SortDownIcon from '@rsuite/icons/SortDown';
import SortUpIcon from '@rsuite/icons/SortUp';
import LockIcon from '@rsuite/icons/legacy/Lock';
import FavoriteIcon from '@rsuite/icons/legacy/Star';

import './serverlist.less';
import { useServers } from '../../utils/config.utils';
import { performUDP } from '../../utils/server.util';

// --------------------------------------------------------- //

function ServerList({list, setProcessing}) {

    const [rawData, setRawData] = useState([]);
    const [selected, setSelected] = useState(null);

    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({
        column: '',
        mode: ''
    });

    const [servers] = useServers();

    // --------------------------------------------------------- //

    useEffect(() => {

        setProcessing(true);

        list.forEach(async (v) => {

            performUDP(v.ip, v.port)
                .then(r => {

                    setRawData(p => {
                        return [...p, r];
                    });
                })
                .catch(() => {
                    setProcessing(false);
                });
        });

    }, [list])

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
                    column: '',
                    mode: ''
                });
            }
        }
    };

    const handleSearch = (value) => {
        setSearch(value.trim());
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
        let borrowed = [...rawData];

        // add favorites key; so it can be used later as well
        borrowed = borrowed.map((v) => {
            return {...v, isFavorite: false}
        });

        borrowed = borrowed.map((v) => {

            if(servers.favorites.findIndex(fav => {
                return (fav.ip + ':' + fav.port) === v.ip;
            }) === -1) {
                return v;
            }

            return {...v, isFavorite: true};
        });

        // search logic
        if(search.trim() !== '') {
            borrowed = borrowed.filter(server => {

                const searchTerm = search.toLowerCase();

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

        // sort (default sorted by ping: asc ; because that's how they're received ; so we'll just use unset instead)
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
                if(sort.mode === 'asc') {
                    return x - y;
                } else {
                    return y - x;
                }
            });
        }

        return borrowed;
    }, [rawData, search, sort, servers]);

    // --------------------------------------------------------- //
    // for drawer

    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleDrawerClose = () => {
        setDrawerOpen(false);
    }

    // --------------------------------------------------------- //

    const handleSelect = useCallback((idx) => {

        setSelected(rows[idx]);
        setDrawerOpen(true);
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
                        handleSelect(next);

                    } else if(event.key === 'ArrowUp') {

                        const current = rows.findIndex(v => v.ip === selected.ip);

                        if(current === 0) return;
                        const next = current - 1;

                        srvList.current.scrollTop -= 15;
                        handleSelect(next);
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

        return () => {
            document.removeEventListener('keydown', listener)
        }
    }, [drawerOpen, selected]);

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

                <span className='srvHeaderMode'>Gamemode</span>
            </div>
            
            <div className='srvList' ref={srvList}>
                {rows.map((element, idx) => {
                    return (
                        <div className={`srvItem ${drawerOpen && selected?.ip === element.ip ? 'srvItem-selected' : ''}`} key={element.ip} onClick={() => handleSelect(idx)}>
                            <span className='srvItemLocked'>{element.password ? <LockIcon /> : ''}</span>
                            <span className='srvItemName'>
                                {element.serverName.length > 55 
                                ? (element.serverName.slice(0, 55) + '...') 
                                : element.serverName}
                            </span>
                            <span className='srvItemFav'>{element.isFavorite ? <FavoriteIcon /> : ''}</span>
                            <span className='srvItemPing'>{element.ping}</span>
                            <span className='srvItemPlayers'>{element.numPlayers}<span>/{element.maxPlayers}</span></span>
                            <span className='srvItemMode'>{element.gameMode.length > 20 ? (element.gameMode.slice(0, 20) + '...') : element.gameMode}</span>
                        </div>
                    )
                })}
                
            </div>
            
            <div className='srvBarWrapper'>
                <InputGroup>
                    <InputGroup.Button appearance='primary'>
                        <ReloadIcon />
                    </InputGroup.Button>

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

            <ServerInfoDrawer open={drawerOpen} handleClose={handleDrawerClose} data={selected}/>
        </React.Fragment>
    );
}

export default ServerList;