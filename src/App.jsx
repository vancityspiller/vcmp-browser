import React, { useState, useEffect, useRef } from 'react';
import { Container, Loader } from 'rsuite';

import DraggableHeader from './components/DraggableHeader';
import { NavStateProvider } from './components/Navbar/Nav.context';
import SideNavbar from './components/Navbar/Navbar';
import Dashboard from './pages/dashboard/Dashboard';

import { checkConfig } from './utils/config.utils';
import { loadFile } from './utils/resfile.util';
import { runUpdater } from './utils/update.util';

// ========================================================= //

function App() {

    const [navAddress, setNavAddress] = useState('Customize');

    const [update, setUpdate] = useState(0);
    const [updating, setUpdating] = useState(true);

    const isInitialMount = useRef(true);

    // --------------------------------------------------------- //

    useEffect(() => {

        const effect = async () => {

            setUpdating(true);

            await checkConfig();
            const settings = await loadFile('settings.json');

            if(settings.updater.checkOnStartup) {
                await runUpdater(settings.updater);
            }

            setUpdating(false);
        }

        // run either on first mount or when manually checking for updates
        if(isInitialMount.current || update > 0) {

            document.addEventListener('contextmenu', event => {
                event.preventDefault();
            });

            effect();
        }

        if(isInitialMount.current) {
            localStorage.clear();
            isInitialMount.current = false;
        }

    }, [update])

    // ========================================================= //

    function NavElement() {
        if(navAddress === 'Dashboard') 

        return ( 
            <NavStateProvider>
                <Dashboard /> 
            </NavStateProvider>
        );
        return (<React.Fragment />);
    }

    // --------------------------------------------------------- //

    return (
        <React.Fragment>
            <Container>
                <DraggableHeader />

                <NavStateProvider>
                    <SideNavbar address={navAddress} setAddress={setNavAddress} />
                </NavStateProvider>
                
                {updating 
                    ? <Loader className='updateLoader' vertical content='Updating...' size='md'/>
                    : <NavElement />
                }
            </Container>
        </React.Fragment>
    );
}

export default App;