import React from 'react';
import { Tooltip, Whisper } from 'rsuite';

function CustomIcon({title, icon, clickCb, selected}) {
    return ( 
        <React.Fragment>
            <Whisper
                placement='right'
                trigger='hover'
                speaker={<Tooltip>{title}</Tooltip>}
            >
                <div className={`nvIconHolder ${selected ? 'nvIconHolderSelected' : 'nvIconHolder-unselected'}`} onClick={clickCb}>
                    <img src={icon} className={`nvIcon ${selected ? 'nvIconSelected' : ''}`}/>
                </div>
            </Whisper>
        </React.Fragment>
    );
}

export default CustomIcon;