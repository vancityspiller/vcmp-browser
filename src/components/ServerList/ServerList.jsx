import React, { useState, useCallback } from 'react';
import ServerInfoDrawer from '../ServerInfoDrawer/ServerInfoDrawer';

// ========================================================= //

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
    ip: "3"
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "4"
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "5"
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: "6"
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: '7'
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: '8'
},
{
    serverName: 'Rob The Vehicle (IV)',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: '9'
},
{
    serverName: 'Polski LCS-DM (Liberty City Stories) by LU-DM Team - discord.gg/PFwem6J',
    gameMode: 'RTV v4.3s',
    ping: '140',
    numPlayers: 5,
    maxPlayers: 100,
    ip: '10'
}];

// --------------------------------------------------------- //

function ServerList() {

    const [rawData, setRawData] = useState([...data]);
    const [rows, setRows] = useState([...rawData]);

    const [selected, setSelected] = useState(null);

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
            
            <ServerInfoDrawer open={drawerOpen} handleClose={handleDrawerClose} data={selected}/>
        </React.Fragment>
    );
}

export default ServerList;