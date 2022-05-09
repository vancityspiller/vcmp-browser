import React, { useState } from 'react';
import { Container } from 'rsuite';
import SideNavbar from './components/Navbar/Navbar';

// ========================================================= //

function App() {

    const [navAddress, setNavAddress] = useState('Dashboard');

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