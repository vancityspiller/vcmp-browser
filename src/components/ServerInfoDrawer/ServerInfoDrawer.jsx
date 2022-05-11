import React, { useCallback, useMemo } from 'react';
import { Button, ButtonToolbar, Drawer, IconButton, Panel, Tag, Tooltip, Whisper } from 'rsuite';
import { Cell, Column, HeaderCell, Table } from 'rsuite-table';
import { clipboard } from '@tauri-apps/api';

// ========================================================= //

import ArrowRightIcon from '@rsuite/icons/ArrowRight';
import TagIcon from '@rsuite/icons/Tag';

import './serverinfodrawer.less';

// ========================================================= //

function ServerInfoDrawer({open, handleClose, data}) {

    // --------------------------------------------------------- //

    const copyClick = useCallback((mode) => {
        
        if(mode === 'ip') {
            clipboard.writeText(data.ip)
                .catch(e => console.log('ERR: clipboard.writeText failed!'));
        } 

        else if(mode === 'info') {
            clipboard.writeText(`Server Name: ${data.serverName}\nIP: ${data.ip}\nGamemode: ${data.gameMode}\nVersion: ${data.version}`)
                .catch(e => console.log('ERR: clipboard.writeText failed!'));
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

    return data ? (
        <React.Fragment>
            <Drawer 
                size='xs' 
                placement='right'
                open={open}
                onClose={handleClose}
            >

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
                <IconButton appearance='primary' icon={<ArrowRightIcon />} size='sm'>
                    Launch
                </IconButton>
                <IconButton appearance='default' icon={<TagIcon />} size='sm'>
                    Set Favorite
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
                Use <Tag>🠕</Tag> and <span><Tag>🠗</Tag> to navigate between servers</span>.
            </div>

            </Drawer>
        </React.Fragment>
    ) 
    : 
    // fallback if no data
    ( <React.Fragment /> );
}

export default ServerInfoDrawer;