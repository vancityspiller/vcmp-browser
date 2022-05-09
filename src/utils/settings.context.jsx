import React, { useState, createContext, useContext } from 'react';

// ======================================================= //

const SettingsContext = createContext();

export const SettingsProvider = ({children}) => {
    
    const [settings, setSettings] = useState();
    return <SettingsContext.Provider value={{settings, setSettings}}>{children}</SettingsContext.Provider>
}

// ------------------------------------------------------- //

export const useSettings = () => useContext(SettingsContext);