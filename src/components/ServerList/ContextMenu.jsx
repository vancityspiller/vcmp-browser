import React, { useEffect } from 'react';
import { Dropdown, Popover } from 'rsuite';

// --------------------------------------------------------- //

// roughly the rendered size of the menu, used to keep it on screen
const MENU_WIDTH = 200;
const MENU_HEIGHT = 300;
// gap left when the menu has to be nudged away from the right edge
const EDGE_MARGIN = 30;

export const MENU_ACTION = {
    LAUNCH: 'launch',
    FAVORITE: 'favorite',
    COPY_IP: 'copyIp',
    COPY_INFO: 'copyInfo',
    BUILD_MODE: 'buildMode',
    HIDE: 'hide'
};

// --------------------------------------------------------- //

/**
 * Keeps the menu inside the window when opened near an edge.
 */
function clampToViewport({x, y}) {

    const right = window.innerWidth - x;
    const bottom = window.innerHeight - y;

    return {
        left: right < MENU_WIDTH ? x - (MENU_WIDTH - right) - EDGE_MARGIN : x,
        top: bottom < MENU_HEIGHT ? y - (MENU_HEIGHT - bottom) : y
    };
}

// --------------------------------------------------------- //

/**
 * Right-click menu for a server row.
 *
 * Position comes from state rather than being written onto the node's style,
 * which is what the previous implementation did through a ref.
 *
 * @param {?{x: Number, y: Number}} position Where to open, or null when closed
 * @param {?Object} server The row the menu was opened on
 * @param {function(String): void} onSelect Receives a MENU_ACTION
 * @param {function(): void} onDismiss
 */
function ContextMenu({position, server, onSelect, onDismiss}) {

    useEffect(() => {
        if(!position) return;

        // any click elsewhere closes the menu
        document.addEventListener('click', onDismiss);
        return () => document.removeEventListener('click', onDismiss);

    }, [position, onDismiss]);

    if(!position) return null;

    // a server that never answered has nothing worth acting on
    const unreachable = server?.ping === 9999;

    return (
        <Popover full style={{position: 'fixed', width: MENU_WIDTH, ...clampToViewport(position)}}>
            <Dropdown.Menu onSelect={onSelect}>
                <Dropdown.Item disabled={unreachable} eventKey={MENU_ACTION.LAUNCH}>Launch</Dropdown.Item>
                <Dropdown.Item eventKey={MENU_ACTION.FAVORITE}>
                    {server?.isFavorite ? 'Remove Favorite' : 'Set Favorite'}
                </Dropdown.Item>
                <Dropdown.Item eventKey={MENU_ACTION.COPY_IP}>Copy IP</Dropdown.Item>
                <Dropdown.Item disabled={unreachable} eventKey={MENU_ACTION.COPY_INFO}>Copy Info</Dropdown.Item>
                <Dropdown.Item disabled={unreachable} eventKey={MENU_ACTION.BUILD_MODE}>Build Mode</Dropdown.Item>
                <Dropdown.Item disabled={server?.isFavorite} eventKey={MENU_ACTION.HIDE}>Hide Server</Dropdown.Item>
            </Dropdown.Menu>
        </Popover>
    );
}

export default ContextMenu;
