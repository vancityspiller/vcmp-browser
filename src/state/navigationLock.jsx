import React, { createContext, useContext, useMemo, useState } from 'react';

// ========================================================= //

const NavigationLockContext = createContext(null);

/**
 * Whether the sidebar may be used.
 *
 * Navigation is blocked while a launch is running, and on first run until the
 * player name and game directory have been filled in. This was previously
 * signalled by writing a string into localStorage from four components.
 */
export function NavigationLockProvider({children}) {

    const [locked, setLocked] = useState(false);
    const value = useMemo(() => ({locked, setLocked}), [locked]);

    return (
        <NavigationLockContext.Provider value={value}>
            {children}
        </NavigationLockContext.Provider>
    );
}

// --------------------------------------------------------- //

export function useNavigationLock() {

    const context = useContext(NavigationLockContext);

    if(!context) {
        throw new Error('useNavigationLock must be used inside a NavigationLockProvider');
    }

    return context;
}
