import { window as appWindow } from '../api/tauri';
import React from 'react';

function DraggableHeader() {

    // need something to grab onto and drag the window
    return (
        <div 
            style={{
                position: 'absolute',
                width: '100%',
                height: '10vh'
            }}
            onMouseDown={() => appWindow.startDragging()}
        />
    );
}

export default DraggableHeader;