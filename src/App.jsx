import React, { useState, useEffect } from 'react';
import { Container } from 'rsuite';
import SideNavbar from './components/Navbar/Navbar';
import { loadConfig } from './utils/config.utils';

// ========================================================= //

function App() {

    const [navAddress, setNavAddress] = useState('Dashboard');
    const [configLoaded, setConfigLoaded] = useState(false);

    useEffect(() => {
        if(!configLoaded) loadConfig(setConfigLoaded);
    }, []);

    // ========================================================= //

    return (
        <React.Fragment>
            <Container>
                <SideNavbar address={navAddress} setAddress={setNavAddress} />
            </Container>
        </React.Fragment>
    );
}

export default App;