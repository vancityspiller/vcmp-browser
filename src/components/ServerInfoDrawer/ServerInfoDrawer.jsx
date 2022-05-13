import React, { useCallback, useMemo } from 'react';
import { Button, ButtonToolbar, Drawer, IconButton, Panel, Tag, Tooltip, Whisper } from 'rsuite';
import { Cell, Column, HeaderCell, Table } from 'rsuite-table';
import { clipboard } from '@tauri-apps/api';

// ========================================================= //

import ArrowRightIcon from '@rsuite/icons/legacy/Play';
import FavIcon from '@rsuite/icons/legacy/Star';
import FavIconUnfilled from '@rsuite/icons/legacy/StarO';
import LockIcon from '@rsuite/icons/legacy/Lock';
import SortDownIcon from '@rsuite/icons/SortDown';
import SortUpIcon from '@rsuite/icons/SortUp';

import './serverinfodrawer.less';

// ========================================================= //

function ServerInfoDrawer({open, handleClose, data, setFavs}) {

    // --------------------------------------------------------- //

    const copyClick = useCallback((mode) => {
        
        if(mode === 'ip') {
            clipboard.writeText(data.ip)
                .catch(() => console.log('ERR: clipboard.writeText failed!'));
        } 

        else if(mode === 'info') {
            clipboard.writeText(`Server Name: ${data.serverName}\nIP: ${data.ip}\nGamemode: ${data.gameMode}\nVersion: ${data.version}`)
                .catch(() => console.log('ERR: clipboard.writeText failed!'));
        }

    }, [data]);

    // --------------------------------------------------------- //

    const getPlayersObj = useMemo(() => {

        if(!data) return [];

        return data.players.map(v => {
            return {
                name: v
            };
        });
    }, [data]);

    // --------------------------------------------------------- //

    const handleFavorite = () => {
        if(data.isFavorite) {
            
            setFavs(p => {
                return p.filter(v => {
                    return data.ip !== (v.ip + ':' + v.port);
                })
            })

        } else {

            const [ip, port] = data.ip.split(':');
            const newFav = {ip: ip, port: parseInt(port)};

            setFavs(p => {
                return [...p, newFav];
            });
        }

        data.isFavorite = !data.isFavorite;
    }

    // --------------------------------------------------------- //

    return (
        <React.Fragment>
            <Drawer 
                size='xs' 
                placement='right'
                open={open}
                onClose={handleClose}
            >
            
            {data &&
            <React.Fragment>
                <Drawer.Header>
                    <Drawer.Title>{data.serverName}</Drawer.Title>
                </Drawer.Header>

                <div className='srvDrawerInfo'>
                    <Panel header='Server Information'>
                        <div className='srvDrawerInfoB'>IP: <span>{data.ip}</span></div>
                        <div className='srvDrawerInfoB'>Gamemode: <span>{data.gameMode.length > 45 ? (data.gameMode.slice(0, 45) + '...') : data.gameMode}</span></div>
                        <div className='srvDrawerInfoB'>Players: <span>{data.numPlayers}/{data.maxPlayers}</span></div>

                        <ButtonToolbar className='srvDrawerInfoButtons'>
                            <Whisper placement="top" trigger="click" speaker={<Tooltip>Copied!</Tooltip>}>
                                <Button appearance='subtle' size='xs' onClick={() => copyClick('ip')}>
                                    Copy IP
                                </Button>
                            </Whisper>

                            <Whisper placement="top" trigger="click" speaker={<Tooltip>Copied!</Tooltip>}>
                                <Button appearance='subtle' size='xs' onClick={() => copyClick('info')}>
                                    Copy Info
                                </Button>
                            </Whisper>
                        </ButtonToolbar>
                    </Panel>                
                </div>

                <ButtonToolbar className='srvDrawerActions'>
                    <IconButton 
                        appearance='primary' 
                        icon={data.password ? <LockIcon className='fixLegacy' /> : <ArrowRightIcon className='fixLegacy' />} 
                        size='sm'
                        disabled={data.ping === 9999}
                    >
                        Launch
                    </IconButton>
                    <IconButton 
                        appearance='default' 
                        icon={data.isFavorite ? <FavIcon className='fixLegacy' /> : <FavIconUnfilled className='fixLegacy' /> } 
                        size='sm'
                        onClick={handleFavorite}
                    >
                        { data.isFavorite ? 'Remove' : 'Set' } Favorite
                    </IconButton>
                </ButtonToolbar>

                <div className='srvDrawerPlayers'>
                    <span className='srvDrawerPlayersTitle'>
                        Players
                    </span>

                    {data.players.length > 0 &&
                        <Table 
                            className='srvDrawerPlayersTable'
                            data={getPlayersObj}
                            headerHeight={0}
                            hover={false}
                            height={250}
                            rowHeight={30}
                            rowClassName='srvDrawerPlayersRow'
                        >
                            <Column width={360}>
                                <HeaderCell></HeaderCell>
                                <Cell dataKey="name" />
                            </Column>
                        </Table>
                    }

                    {data.players.length === 0 && 
                        <div className='srvDrawerPlayersFB' />
                    }
                </div>

                <div className='srvDrawerTip'>
                    Use <Tag><SortUpIcon /></Tag> and <span><Tag><SortDownIcon /></Tag> to navigate between servers</span>.
                </div>
            </React.Fragment>
            }

            </Drawer>
        </React.Fragment>
    ) 
}

export default ServerInfoDrawer;