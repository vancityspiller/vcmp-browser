import React, { useState, useEffect } from 'react';
import { Container } from 'rsuite';
import DraggableHeader from './components/DraggableHeader';
import SideNavbar from './components/Navbar/Navbar';
import Dashboard from './pages/dashboard/Dashboard';
import { loadConfig } from './utils/config.utils';
import { useSettings } from './utils/settings.context';

// ========================================================= //

function App() {

    const [navAddress, setNavAddress] = useState('Dashboard');
    const [configLoaded, setConfigLoaded] = useState(false);

    const {setSettings} = useSettings();

    useEffect(() => {
        if(!configLoaded) loadConfig(setConfigLoaded, setSettings);
    }, []);

    // ========================================================= //

    return (
        <React.Fragment>
            <Container>
                <DraggableHeader />
                <SideNavbar address={navAddress} setAddress={setNavAddress} />
                {configLoaded &&
                    <Dashboard />
                }
            </Container>
        </React.Fragment>
    );
}

export default App;