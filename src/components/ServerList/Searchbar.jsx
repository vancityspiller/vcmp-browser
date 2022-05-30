import React from 'react';
import { InputGroup, Input } from 'rsuite';

import ReloadIcon from '@rsuite/icons/legacy/Refresh';
import CloseIcon from '@rsuite/icons/legacy/Close';

// ========================================================= //

function Searchbar({search, handleSearch, reloadCb}) {
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
            </InputGroup>
        </div>  
    );
}

export default Searchbar;