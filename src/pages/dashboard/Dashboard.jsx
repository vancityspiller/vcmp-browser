import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IconButton, Container, Content, Header, Loader, Nav, Tag } from 'rsuite';
import ServerList from '../../components/ServerList/ServerList';

import { fetchJson } from '../../api/tauri';
import { queryServer, queryServers } from '../../api/servers';
import { loadFile, saveFile } from '../../utils/resfile.util';
import { useAfterMount } from '../../hooks/useAfterMount';
import { useUnmountEffect } from '../../hooks/useUnmountEffect';

// ========================================================= //

import ReloadIcon from '@rsuite/icons/legacy/Refresh';
import ExcIcon from '@rsuite/icons/legacy/ExclamationTriangle';

import './dashboard.less';

// --------------------------------------------------------- //

// Q and E cycle the tabs, in this order
const TABS = ['Favorites', 'Masterlist', 'Featured', 'Recent'];

// tabs that depend on the masterlist, and so show its loading and error states
const MASTERLIST_TABS = ['Masterlist', 'Featured'];

// don't cache a list that is still filling in
const SETTLE_DELAY = 1500;

const CACHE_KEY = 'servers';
const LAST_TAB_KEY = 'lastTab';

// --------------------------------------------------------- //

/** Formats a stored favorite or recent as the "ip:port" key the lists use. */
const addressOf = (entry) => `${entry.ip}:${entry.port}`;

// --------------------------------------------------------- //

function Dashboard() {

    const [tab, setTab] = useState();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [reload, setReload] = useState(0);

    // the user's own lists, as stored in servers.json
    const [favs, setFavs] = useState(null);
    const [hiddens, setHidden] = useState(null);
    const [recents, setRecents] = useState(null);

    // query results
    const [serverList, setServerList] = useState([]);
    const [favList, setFavList] = useState([]);
    const [featuredList, setFeaturedList] = useState([]);
    const [recentList, setRecentList] = useState([]);

    const lastUpdate = useRef(Date.now());

    // --------------------------------------------------------- //

    const forceReload = useCallback(() => setReload(p => p + 1), []);

    const selectTab = useCallback((key) => {
        setTab(previous => previous === key ? previous : key);
    }, []);

    // --------------------------------------------------------- //

    // Cache the lists when leaving the dashboard, so coming back from another
    // page is instant. Skipped while results are still arriving, and when there
    // is nothing worth keeping.
    useUnmountEffect(() => {

        if(serverList.length === 0) return;
        if(Date.now() - lastUpdate.current < SETTLE_DELAY) return;

        localStorage.setItem(CACHE_KEY, JSON.stringify({
            favs, hiddens, recents, serverList, favList, featuredList, recentList
        }));
    });

    // --------------------------------------------------------- //

    useEffect(() => {

        const load = async () => {

            setLoading(true);
            setFailed(false);
            setServerList([]);
            setFeaturedList([]);

            const settingsFile = await loadFile('settings.json');

            // ------------------------------------------------- //
            // a manual reload always goes to the network

            if(reload === 0) {
                const storedTab = localStorage.getItem(LAST_TAB_KEY);
                setTab(storedTab ?? settingsFile.master.defaultTab);

                const cached = localStorage.getItem(CACHE_KEY);

                if(cached !== null) {
                    const stored = JSON.parse(cached);

                    setFavs(stored.favs);
                    setHidden(stored.hiddens);
                    setRecents(stored.recents);

                    setServerList(stored.serverList);
                    setFeaturedList(stored.featuredList);
                    setRecentList(stored.recentList);
                    setFavList(stored.favList);

                    setLoading(false);
                    return;
                }
            }

            // ------------------------------------------------- //

            const {favorites, history, hidden} = await loadFile('servers.json');
            setFavs(favorites);
            setRecents(history);
            setHidden(hidden);

            let masterServers = [];
            let official = new Set();
            let masterlistFailed = false;

            try {
                const response = await fetchJson(`${settingsFile.master.url}servers`);

                if(!Array.isArray(response.servers)) {
                    throw new Error('masterlist response carried no servers');
                }

                masterServers = response.servers;

                // the masterlist already flags official servers, so the
                // featured tab needs no request of its own
                official = new Set(
                    masterServers.filter(v => v.is_official).map(addressOf)
                );

            } catch {
                masterlistFailed = true;
                setFailed(true);
            }

            setLoading(false);

            // ------------------------------------------------- //
            // Each of these queries its whole list over one socket, so they
            // finish in about the time of the slowest server rather than the
            // sum of all of them.

            if(reload === 0) {
                setFavList([]);

                queryServers(favorites, result => {
                    lastUpdate.current = Date.now();
                    setFavList(p => [...p, result]);
                });
            }

            if(!masterlistFailed) {
                queryServers(masterServers, result => {
                    lastUpdate.current = Date.now();
                    setServerList(p => [...p, result]);

                    if(official.has(result.ip)) {
                        setFeaturedList(p => [...p, result]);
                    }
                });
            }

            // recents are only loaded once; later changes are handled below
            if(reload !== 0) return;

            setRecentList([]);

            queryServers(history, result => {
                lastUpdate.current = Date.now();

                const entry = history.find(v => addressOf(v) === result.ip);
                setRecentList(p => [...p, {...result, addedAt: entry?.addedAt}]);
            });
        };

        load();
    }, [reload]);

    // --------------------------------------------------------- //

    // A server was just played: add it, or refresh when it was played again.
    useAfterMount(() => {

        if(recents === null) return;

        const sync = async () => {

            const newest = recents.at(-1);
            const fetched = newest ? await queryServer(newest.ip, newest.port) : null;

            setRecentList(previous => {

                if(!previous) return previous;

                if(fetched && previous.length < recents.length) {
                    return [...previous, {...fetched, addedAt: newest.addedAt}];
                }

                // same entries, so only the timestamps can have moved
                return previous.map(row => {
                    const entry = recents.find(v => addressOf(v) === row.ip);
                    return entry ? {...row, addedAt: entry.addedAt} : row;
                });
            });

            const servers = await loadFile('servers.json');
            await saveFile('servers.json', {...servers, history: recents});
        };

        sync();
    }, [recents]);

    // --------------------------------------------------------- //

    // A favorite was added or removed.
    useAfterMount(() => {

        if(favs === null) return;

        const sync = async () => {

            const newest = favs.at(-1);
            const addresses = new Set(favs.map(addressOf));

            const fetched = newest ? await queryServer(newest.ip, newest.port) : null;

            setFavList(previous => {

                if(!previous) return previous;

                if(previous.length > favs.length) {
                    return previous.filter(v => addresses.has(v.ip));
                }

                if(fetched && previous.length < favs.length) {
                    return [...previous, fetched];
                }

                return previous;
            });

            const servers = await loadFile('servers.json');
            await saveFile('servers.json', {...servers, favorites: favs});
        };

        sync();
    }, [favs]);

    // --------------------------------------------------------- //

    useAfterMount(() => {

        const sync = async () => {
            const servers = await loadFile('servers.json');
            await saveFile('servers.json', {...servers, hidden: hiddens});
        };

        sync();
    }, [hiddens]);

    // --------------------------------------------------------- //

    useEffect(() => {

        // Q and E step through the tabs
        const onKeyDown = event => {

            if(event.ctrlKey) return;

            // not while the user is typing in the search box
            if(document.activeElement?.nodeName === 'INPUT') return;

            const step = event.key === 'e' ? 1 : (event.key === 'q' ? -1 : 0);
            if(step === 0) return;

            const current = TABS.indexOf(tab);
            if(current === -1) return;

            selectTab(TABS[(current + step + TABS.length) % TABS.length]);
        };

        // remember the tab so the next visit opens on it
        if(tab) localStorage.setItem(LAST_TAB_KEY, tab);

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);

    }, [tab, selectTab]);

    // --------------------------------------------------------- //

    // shared by every tab; only the list differs
    const listProps = {
        hiddenList: hiddens,
        changeHidden: setHidden,
        favoriteList: favs,
        changeFavs: setFavs,
        changeRecents: setRecents
    };

    const awaitingMasterlist = (loading || failed) && MASTERLIST_TABS.includes(tab);

    return (
        <Content>
            <Container>
                <Header className='dashHeader'>
                    <div className='dashNavWrapper'>
                        <Tag className='dashTag' size='sm'> Q </Tag>

                        <Nav
                            appearance='default'
                            className='dashNav'
                            onSelect={(eventKey, event) => selectTab(event.target.outerText)}
                        >
                            {TABS.map(name => (
                                <Nav.Item as={'span'} key={name} active={tab === name}>{name}</Nav.Item>
                            ))}
                        </Nav>

                        <Tag className='dashTag' size='sm'> E </Tag>
                    </div>
                </Header>

                {awaitingMasterlist
                    ?
                        failed
                            ?
                                <div className='dashFetchError'>
                                    <ExcIcon className='dashExc' />
                                    <h5>Failed to fetch masterlist</h5>
                                    <IconButton icon={<ReloadIcon />} onClick={forceReload}>Retry</IconButton>
                                </div>
                            :
                                <Loader className='dashLoader' vertical content='Fetching masterlist...' size='md' />
                    :
                        <Content>
                            {tab === 'Masterlist' && <ServerList list={serverList} updateList={setServerList} reloadCb={forceReload} {...listProps} />}
                            {tab === 'Featured' && <ServerList list={featuredList} updateList={setFeaturedList} reloadCb={forceReload} {...listProps} />}
                            {tab === 'Recent' && <ServerList list={recentList} updateList={setRecentList} recentsTab {...listProps} />}
                            {tab === 'Favorites' && <ServerList list={favList} updateList={setFavList} favoritesTab {...listProps} />}
                        </Content>
                }
            </Container>
        </Content>
    );
}

export default Dashboard;
