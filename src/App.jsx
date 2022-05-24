import React, { useState, useEffect, useRef } from 'react';
import { Container, Loader, Notification } from 'rsuite';

import { dialog } from '@tauri-apps/api';
import { appWindow } from '@tauri-apps/api/window';

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

    const [navAddress, setNavAddress] = useState('Customize');

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
                dialog.message(`Fatal Error: ${e}! Program will exit.`)
                .then(() => appWindow.close());
            }

            const settings = await loadFile('settings.json');

            if(settings.updater.checkOnStartup) {
                try {
                    await runUpdater(settings.updater);
                } catch (e) {
                    setUpdFailed(true);
                }
            }

            if(settings.gameDir === '' || settings.playerName === '') {
                localStorage.setItem('navSwitching', 'false');
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

    function NavElement() {
        if(navAddress === 'Dashboard') {
            return ( <Dashboard /> );
        }

        if(navAddress === 'Customize') {
            return ( <Customize/> );
        }

        if(navAddress === 'About') {
            return ( <About /> );
        }

        if(navAddress === 'Settings') {
            return ( <Settings setUpdate={setUpdate}/> );
        }

        return (<React.Fragment />);
    }

    // --------------------------------------------------------- //

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
             
                {updating 
                    ? <Loader className='updateLoader' vertical content='Updating...' size='md'/>
                    : <NavElement />
                }
                
            </Container>
        </React.Fragment>
    );
}

export default App;