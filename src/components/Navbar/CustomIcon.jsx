import React from 'react';
import { Tooltip, Whisper } from 'rsuite';

function CustomIcon({title, icon, clickCb, selected, exClass}) {
    return ( 
        <React.Fragment>
            <Whisper
                placement='right'
                trigger='hover'
                speaker={<Tooltip>{title}</Tooltip>}
            >
                <div className={`nvIconHolder ${selected ? 'nvIconHolderSelected' : (exClass ? '' : 'nvIconHolder-unselected')}${exClass ? exClass : ''}`} onClick={clickCb}>
                    <img src={icon} className={`nvIcon ${selected ? 'nvIconSelected' : ''} ${exClass ? '' : 'nvIcon2'}`}/>
                </div>
            </Whisper>
        </React.Fragment>
    );
}

export default CustomIcon;