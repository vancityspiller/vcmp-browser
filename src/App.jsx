import React, { useState, useEffect } from 'react';
import { Container } from 'rsuite';
import DraggableHeader from './components/DraggableHeader';
import SideNavbar from './components/Navbar/Navbar';
import Dashboard from './pages/dashboard/Dashboard';
import { checkConfig } from './utils/config.utils';

// ========================================================= //

function App() {

    const [navAddress, setNavAddress] = useState('Dashboard');
    const [configLoaded, setConfigLoaded] = useState(false);

    useEffect(() => {
        if(!configLoaded) checkConfig(setConfigLoaded);
    }, []);

    // ========================================================= //

    function NavElement() {
        if(navAddress === 'Dashboard') return ( <Dashboard /> );
        return (<React.Fragment />);
    }

    // --------------------------------------------------------- //

    return (
        <React.Fragment>
            <Container>
                <DraggableHeader />
                <SideNavbar address={navAddress} setAddress={setNavAddress} />
                {configLoaded &&
                    <NavElement />
                }
            </Container>
        </React.Fragment>
    );
}

export default App;