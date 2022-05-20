import React, { useRef, createContext, useContext } from 'react';
const NavContext = createContext();

// ======================================================= //

export const NavStateProvider = ({children}) => {

    const disableNavSwitching = useRef(false);
    return <NavContext.Provider value={{disableNavSwitching}}>{children}</NavContext.Provider>
}

// ======================================================= //

export const useNavState = () => useContext(NavContext);