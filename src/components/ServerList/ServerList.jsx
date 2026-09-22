import React, { useState, useCallback, useMemo, useRef } from 'react';
import ReactTimeAgo from 'react-time-ago';

import AddFav from './AddFav';
import PasswordModal from './PasswordModal';
import LaunchModal from './LaunchModal';
import ContextMenu, { MENU_ACTION } from './ContextMenu';
import Searchbar from './Searchbar';
import ServerlistHeader from './Header';

import ServerInfoDrawer from '../ServerInfoDrawer/ServerInfoDrawer';

import { clipboard } from '../../api/tauri';
import { queryServer } from '../../api/servers';
import { useServerFilters, WAITING_ROW } from './useServerFilters';
import { useListKeyboard } from './useListKeyboard';

// ========================================================= //

import LockIcon from '@rsuite/icons/legacy/Lock';
import FavoriteIcon from '@rsuite/icons/legacy/Star';
import ExcIcon from '@rsuite/icons/legacy/ExclamationTriangle';

import './serverlist.less';

// --------------------------------------------------------- //

// names longer than this are cut short to keep the columns aligned
const MAX_NAME_LENGTH = 55;
const MAX_GAMEMODE_LENGTH = 20;

function truncate(text, limit) {
    return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

// --------------------------------------------------------- //

function ServerList({
    list, updateList, favoriteList, hiddenList,
    changeFavs, changeHidden, changeRecents,
    reloadCb, recentsTab, favoritesTab
}) {

    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');
    const [showLocked, setShowLocked] = useState(true);
    const [sort, setSort] = useState({
        column: favoritesTab || recentsTab ? 'addedAt' : '',
        mode: favoritesTab ? 'des' : (recentsTab ? 'asc' : '')
    });

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState(null);
    const [passwordModal, setPasswordModal] = useState(false);
    const [enteredPassword, setEnteredPassword] = useState('');
    const [launchProgress, setLaunchProgress] = useState('');

    const buildMode = useRef(false);
    const listRef = useRef();

    // --------------------------------------------------------- //

    const {rows, totalPlayers} = useServerFilters({
        list, search, sort, favoriteList, hiddenList, showLocked, recentsTab, favoritesTab
    });

    const searchPlaceholder = useMemo(
        () => `Search in ${rows.length} servers and ${totalPlayers} players`,
        [rows.length, totalPlayers]
    );

    // --------------------------------------------------------- //

    /**
     * Opens a server in the drawer, refreshing its details unless we are
     * stepping through the list with the arrow keys.
     */
    const handleSelect = useCallback(async (idx, skipRefresh = false) => {

        const current = rows[idx];
        if(!current) return;

        setSelected({...current});
        setDrawerOpen(true);

        if(skipRefresh) return;

        const [ip, port] = current.ip.split(':');
        let refreshed = await queryServer(ip, parseInt(port));

        if(refreshed.ping === null) {
            refreshed = {...refreshed, ...WAITING_ROW};
        }

        refreshed.isFavorite = current.isFavorite;
        if(recentsTab) refreshed.addedAt = current.addedAt;

        setSelected(refreshed);

        updateList(previous => previous.map(v => v.ip === current.ip ? refreshed : v));

    }, [rows, recentsTab, updateList]);

    // --------------------------------------------------------- //

    const requestLaunch = useCallback((server = selected) => {
        server?.password ? setPasswordModal(true) : setLaunchProgress('updater');
    }, [selected]);

    const handleDirectLaunch = useCallback(idx => {
        const server = rows[idx];
        if(!server) return;

        setSelected({...server});
        buildMode.current = false;
        requestLaunch(server);

    }, [rows, requestLaunch]);

    // --------------------------------------------------------- //

    useListKeyboard({
        rows,
        selected,
        active: drawerOpen,
        listRef,
        onSelect: handleSelect
    });

    // ========================================================= //

    const toggleFavorite = useCallback(() => {

        if(!selected) return;

        if(selected.isFavorite) {
            changeFavs(p => p.filter(v => `${v.ip}:${v.port}` !== selected.ip));

        } else {
            const [ip, port] = selected.ip.split(':');
            changeFavs(p => [...p, {ip: ip, port: parseInt(port), addedAt: Date.now()}]);
        }

        setSelected(p => p && {...p, isFavorite: !p.isFavorite});

    }, [selected, changeFavs]);

    // --------------------------------------------------------- //

    const copyInfo = useCallback(mode => {

        if(!selected) return;

        const text = mode === 'ip'
            ? selected.ip
            : `Server Name: ${selected.serverName}\nIP: ${selected.ip}\n`
              + `Gamemode: ${selected.gameMode}\nVersion: ${selected.version}`;

        clipboard.writeText(text).catch(() => console.error('could not write to the clipboard'));

    }, [selected]);

    // --------------------------------------------------------- //

    const hideServer = useCallback(() => {
        if(selected) changeHidden(p => [...p, selected.ip]);
    }, [selected, changeHidden]);

    // ========================================================= //

    const openContextMenu = (idx, event) => {
        event.preventDefault();

        setSelected({...rows[idx]});
        setMenuPosition({x: event.clientX, y: event.clientY});
    };

    const dismissContextMenu = useCallback(() => setMenuPosition(null), []);

    const handleMenuSelect = key => {

        switch(key) {
            case MENU_ACTION.LAUNCH:
                buildMode.current = false;
                requestLaunch();
                break;

            case MENU_ACTION.BUILD_MODE:
                buildMode.current = true;
                requestLaunch();
                break;

            case MENU_ACTION.FAVORITE:  toggleFavorite(); break;
            case MENU_ACTION.COPY_IP:   copyInfo('ip'); break;
            case MENU_ACTION.COPY_INFO: copyInfo('info'); break;
            case MENU_ACTION.HIDE:      hideServer(); break;
        }

        dismissContextMenu();
    };

    // --------------------------------------------------------- //

    return (
        <React.Fragment>

            <ContextMenu
                position={menuPosition}
                server={selected}
                onSelect={handleMenuSelect}
                onDismiss={dismissContextMenu}
            />

            <ServerlistHeader sort={sort} setSort={setSort} recentsTab={recentsTab} favoritesTab={favoritesTab} />
            {favoritesTab && <AddFav setFavorites={changeFavs} />}

            {rows.length === 0
                ?
                    <div className='srvEmptyFallback'>
                        <ExcIcon />
                        <h5>No servers found</h5>
                        <span>{search.length > 0 ? 'refine your search' : 'might still be loading'}</span>
                    </div>
                :
                    <div className='srvList' ref={listRef}>
                        {rows.map((element, idx) => (
                            <div
                                className={`srvItem ${drawerOpen && selected?.ip === element.ip ? 'srvItem-selected' : ''}`}
                                key={element.ip}
                                onClick={e => e.ctrlKey ? handleDirectLaunch(idx) : handleSelect(idx)}
                                onContextMenu={event => openContextMenu(idx, event)}
                            >
                                <span className='srvItemLocked'>{element.password ? <LockIcon /> : ''}</span>

                                <span className='srvItemName'>
                                    {element.version === '03zR2' && <span className='srvItemFlair'>[R2] </span>}
                                    {truncate(element.serverName, MAX_NAME_LENGTH)}
                                </span>

                                <span className='srvItemFav'>{element.isFavorite ? <FavoriteIcon /> : ''}</span>
                                <span className='srvItemPing'>{element.ping}</span>
                                <span className='srvItemPlayers'>
                                    {element.numPlayers}<span>/{element.maxPlayers}</span>
                                </span>

                                <span className='srvItemMode'>
                                    {recentsTab
                                        ? <ReactTimeAgo date={element.addedAt} />
                                        : truncate(element.gameMode, MAX_GAMEMODE_LENGTH)}
                                </span>
                            </div>
                        ))}
                    </div>
            }

            <Searchbar
                search={search}
                handleSearch={setSearch}
                reloadCb={reloadCb}
                locked={showLocked}
                setLocked={setShowLocked}
                placeholder={searchPlaceholder}
            />

            <ServerInfoDrawer
                open={drawerOpen}
                handleClose={() => setDrawerOpen(false)}
                data={selected}
                handleFavorite={toggleFavorite}
                handleCopy={copyInfo}
                handleLaunch={() => requestLaunch()}
            />

            <PasswordModal
                open={passwordModal}
                setOpen={setPasswordModal}
                selected={selected}
                next={() => { setPasswordModal(false); setLaunchProgress('updater'); }}
                password={enteredPassword}
                setPassword={setEnteredPassword}
            />

            <LaunchModal
                progress={launchProgress}
                setProgress={setLaunchProgress}
                selected={selected}
                password={enteredPassword}
                setRecents={changeRecents}
                buildMode={buildMode}
            />

        </React.Fragment>
    );
}

export default ServerList;
