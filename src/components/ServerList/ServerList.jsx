import React, { useState, useCallback, useMemo } from 'react';
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

// --------------------------------------------------------- //

const data = [{
    serverName: 'Polski LCS-DM (Liberty City Stories) by LU-DM Team - discord.gg/PFwem6J',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "1",
    players: [
        'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test','Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test'
    ],
    password: true
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: '[Main Lobby] [A/D] Liberty City Killers:Basemode Public Server',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "2",
    players: [],
    password: false
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "3",
    players: [],
    password: false
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "4",
    players: [],
    password: false
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "5",
    players: [],
    password: false
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "6",
    players: [],
    password: false
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: '7',
    players: [],
    password: false
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: '8',
    players: [],
    password: false
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: '9',
    players: [],
    password: false
},
{
    serverName: 'Polski LCS-DM (Liberty City Stories) by LU-DM Team - discord.gg/PFwem6J',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: '10',
    players: [],
    password: false
}];

// --------------------------------------------------------- //

function ServerList() {

    const [rawData, setRawData] = useState([...data]);
    const [selected, setSelected] = useState(null);

    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({
        column: '',
        mode: ''
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
            // TODO: map with favorite list when implemented
            return {...v, isFavorite: true}
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
    }, [rawData, search, sort]);

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
    }, []);

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
            
            <div className='srvList'>
                {rows.map((element, idx) => {
                    return (
                        <div className='srvItem' key={element.ip} onClick={() => handleSelect(idx)}>
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