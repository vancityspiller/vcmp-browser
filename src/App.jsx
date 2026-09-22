import React, { useState, useEffect, useRef } from 'react';
import { Container, Loader, Notification } from 'rsuite';

import { message, window as appWindow } from './api/tauri';
import { useNavigationLock } from './state/navigationLock';

import DraggableHeader from './components/DraggableHeader';
import SideNavbar from './components/Navbar/Navbar';
import About from './pages/about/About';
import Customize from './pages/customize/Customize';
import Dashboard from './pages/dashboard/Dashboard';
import Settings from './pages/settings/Settings';

import { checkConfig } from './utils/config.utils';
import { loadFile } from './utils/resfile.util';
import { runUpdater } from './utils/update.util';

// ========================================================= //

function App() {

    const [navAddress, setNavAddress] = useState('Dashboard');
    const {setLocked} = useNavigationLock();

    const [update, setUpdate] = useState(0);
    const [updating, setUpdating] = useState(true);
    const [updFailed, setUpdFailed] = useState(false);

    const isInitialMount = useRef(true);

    // --------------------------------------------------------- //

    useEffect(() => {
        // only on the first mount
        if(isInitialMount.current) {
            localStorage.clear();
        }
    }, []);

    useEffect(() => {

        const effect = async () => {

            setUpdating(true);
            setUpdFailed(false);

            // try-catch for any fatal errors
            try {
                await checkConfig();
            } catch (e) {
                await message(`Fatal Error: ${e}! Program will exit.`);
                await appWindow.close();
                return;
            }

            const settings = await loadFile('settings.json');

            if(settings.updater.checkOnStartup) {
                try {
                    await runUpdater(settings.updater);
                } catch (e) {
                    setUpdFailed(true);
                }
            }

            // nothing works without these, so keep the user on Customize
            if(settings.gameDir === '' || settings.playerName === '') {
                setLocked(true);
                setNavAddress('Customize');
            }

            setUpdating(false);
        }

        // only on the first mount
        if(isInitialMount.current) {
            document.addEventListener('contextmenu', event => {
                event.preventDefault();
            });
        }

        // run either on first mount or when manually checking for updates
        if(isInitialMount.current || update > 0) {
            effect();
        }

        if(isInitialMount.current) {
            isInitialMount.current = false;
        }

    }, [update])

    // ========================================================= //

    return (
        <React.Fragment>
            <Container>
                <DraggableHeader />

                <SideNavbar address={navAddress} setAddress={setNavAddress} />

                {updFailed &&
                    <Notification closable type='error' className='notificationDiv' header='Error'>
                        Failed to fetch update!
                    </Notification>
                }
             
                {/*
                    Rendered inline rather than through a component declared in
                    this function. Such a component gets a new identity on every
                    render, so React unmounts and remounts the whole page -
                    losing the dashboard's server lists and selection any time
                    App re-rendered, such as when the navigation lock changed.
                */}
                {updating
                    ? <Loader className='updateLoader' vertical content='Updating...' size='md'/>
                    : <React.Fragment>
                        {navAddress === 'Dashboard' && <Dashboard />}
                        {navAddress === 'Customize' && <Customize />}
                        {navAddress === 'About' && <About />}
                        {navAddress === 'Settings' && <Settings setUpdate={setUpdate} />}
                    </React.Fragment>
                }
                
            </Container>
        </React.Fragment>
    );
}

export default App;