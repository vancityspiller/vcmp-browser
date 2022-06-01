import React from 'react';
import { InputGroup, Input, Whisper, Tooltip } from 'rsuite';

import ReloadIcon from '@rsuite/icons/legacy/Refresh';
import CloseIcon from '@rsuite/icons/legacy/Close';
import UnlockIcon from '@rsuite/icons/legacy/UnlockAlt';

// ========================================================= //

function Searchbar({search, handleSearch, reloadCb, locked, setLocked}) {

    const handleLocked = () => {
        setLocked(p => !p);
    }

    // --------------------------------------------------------- //
    
    return (
        <div className='srvBarWrapper'>
            <InputGroup>
                { reloadCb !== undefined && 
                    <InputGroup.Button appearance='primary' onClick={reloadCb}>
                        <ReloadIcon />
                    </InputGroup.Button>
                }

                <Input 
                    placeholder='Search' 
                    size='md' 
                    value={search}
                    onChange={handleSearch}
                />

                <InputGroup.Button appearance='primary' onClick={() => handleSearch('')}>
                    <CloseIcon />
                </InputGroup.Button>

                {
                    reloadCb !== undefined && 
                    <Whisper
                        placement='top'
                        trigger='hover'
                        speaker={
                            <Tooltip>Exclude locked</Tooltip>
                        }
                    >
                        <InputGroup.Button className={locked ? '' : 'srvDisplayLocked'} onClick={handleLocked}>
                            <UnlockIcon />
                        </InputGroup.Button>
                    </Whisper>
                }
            </InputGroup>
        </div>  
    );
}

export default Searchbar;