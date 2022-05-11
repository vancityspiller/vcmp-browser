import React, { useState, useCallback, useMemo } from 'react';
import { Input, InputGroup } from 'rsuite';
import ServerInfoDrawer from '../ServerInfoDrawer/ServerInfoDrawer';

// ========================================================= //

import ReloadIcon from '@rsuite/icons/Reload';
import CloseIcon from '@rsuite/icons/Close';

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
    ]
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: '[Main Lobby] [A/D] Liberty City Killers:Basemode Public Server',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "2",
    players: []
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "3",
    players: []
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "4",
    players: []
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "5",
    players: []
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "6",
    players: []
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: '7',
    players: []
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: '8',
    players: []
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: '9',
    players: []
},
{
    serverName: 'Polski LCS-DM (Liberty City Stories) by LU-DM Team - discord.gg/PFwem6J',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: '10',
    players: []
}];

// --------------------------------------------------------- //

function ServerList() {

    const [rawData, setRawData] = useState([...data]);
    const [selected, setSelected] = useState(null);

    const [search, setSearch] = useState('');

    const handleSearch = (value) => {
        setSearch(value.trim());
    }

    const rows = useMemo(() => {

        let borrowed = [...rawData];

        if(search.trim() !== '') {
            borrowed = borrowed.filter(server => {

                const searchTerm = search.toLowerCase();

                if(server.serverName.toLowerCase().indexOf(searchTerm) !== -1)
                    return true;

                if(server.ip.toLowerCase().indexOf(searchTerm) !== -1)
                    return true;

                let playerSearch = false;
                
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

        return borrowed;
    }, [rawData, search]);

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
    }, [])

    // --------------------------------------------------------- //

    return (
        <React.Fragment>
            <div className='srvHeader'>
                <span className='srvHeaderName'>Server</span>
                <span className='srvHeaderPing'>Ping</span>
                <span className='srvHeaderPlayers'>Players</span>
                <span className='srvHeaderMode'>Gamemode</span>
            </div>
            
            <div className='srvList'>
                {rows.map((element, idx) => {
                    return (
                        <div className='srvItem' key={element.ip} onClick={() => handleSelect(idx)}>
                            <span className='srvItemName'>{element.serverName.length > 55 ? (element.serverName.slice(0, 55) + '...') : element.serverName}</span>
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
                        size='sm' 
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