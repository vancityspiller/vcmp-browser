import React from 'react';

// ========================================================= //

import './serverlist.less';

// --------------------------------------------------------- //

function ServerList() {

    const data = [{
        serverName: 'Polski LCS-DM (Liberty City Stories) by LU-DM Team - discord.gg/PFwem6J',
        gameMode: 'RTV v4.3s',
        ping: '140',
        numPlayers: 5,
        maxPlayers: 100
    },
    {
        serverName: 'Rob The Vehicle (IV)',
        gameMode: '[Main Lobby] [A/D] Liberty City Killers:Basemode Public Server',
        ping: '140',
        numPlayers: 5,
        maxPlayers: 100
    },
    {
        serverName: 'Rob The Vehicle (IV)',
        gameMode: 'RTV v4.3s',
        ping: '140',
        numPlayers: 5,
        maxPlayers: 100
    },
    {
        serverName: 'Rob The Vehicle (IV)',
        gameMode: 'RTV v4.3s',
        ping: '140',
        numPlayers: 5,
        maxPlayers: 100
    },
    {
        serverName: 'Rob The Vehicle (IV)',
        gameMode: 'RTV v4.3s',
        ping: '140',
        numPlayers: 5,
        maxPlayers: 100
    },
    {
        serverName: 'Rob The Vehicle (IV)',
        gameMode: 'RTV v4.3s',
        ping: '140',
        numPlayers: 5,
        maxPlayers: 100
    },
    {
        serverName: 'Rob The Vehicle (IV)',
        gameMode: 'RTV v4.3s',
        ping: '140',
        numPlayers: 5,
        maxPlayers: 100
    },
    {
        serverName: 'Rob The Vehicle (IV)',
        gameMode: 'RTV v4.3s',
        ping: '140',
        numPlayers: 5,
        maxPlayers: 100
    },
    {
        serverName: 'Rob The Vehicle (IV)',
        gameMode: 'RTV v4.3s',
        ping: '140',
        numPlayers: 5,
        maxPlayers: 100
    },
    {
        serverName: 'Polski LCS-DM (Liberty City Stories) by LU-DM Team - discord.gg/PFwem6J',
        gameMode: 'RTV v4.3s',
        ping: '140',
        numPlayers: 5,
        maxPlayers: 100
    }];

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
                {data.map(element => {
                    return (
                        <div className='srvItem'>
                            <span className='srvItemName'>{element.serverName.length > 55 ? (element.serverName.slice(0, 55) + '...') : element.serverName}</span>
                            <span className='srvItemPing'>{element.ping}</span>
                            <span className='srvItemPlayers'>{element.numPlayers}<span>/{element.maxPlayers}</span></span>
                            <span className='srvItemMode'>{element.gameMode.length > 20 ? (element.gameMode.slice(0, 20) + '...') : element.gameMode}</span>
                        </div>
                    )
                })}
                
            </div>
        </React.Fragment>
    );
}

export default ServerList;