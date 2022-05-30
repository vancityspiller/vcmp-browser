import React, {useCallback} from 'react';

import SortDownIcon from '@rsuite/icons/SortDown';
import SortUpIcon from '@rsuite/icons/SortUp';

// ========================================================= //

function ServerlistHeader({sort, setSort, favoritesTab, recentsTab}) {

    const handleSort = (value) => {

        // if no sort mode set, set this one!
        if(sort.column !== value) {
            setSort({
                column: value,
                mode: 'asc'
            });

        } else {
            if(sort.mode === 'asc') {
                // if mode is ascending, switch it to descending
                setSort({
                    column: value,
                    mode: 'des'
                });
            
            } else {
                // otherwise, unset it
                setSort({
                    column: favoritesTab || recentsTab ? 'addedAt' : '',
                    mode: favoritesTab ? 'des' : (recentsTab ? 'asc' : '')
                });
            }
        }
    };

    // --------------------------------------------------------- //

    const isSorted = useCallback((column) => {
        if(column === sort.column) {
            return sort.mode;
        }

        return false;
    }, [sort]);

    function SortedIcon(column) {
        
        const mode = isSorted(column);

        if(mode === 'asc') {
            return <SortDownIcon />
        } else if(mode === 'des') {
            return <SortUpIcon />
        } else {
            return <React.Fragment />
        }
    }

    // --------------------------------------------------------- //

    return ( 
        <div className='srvHeader'>
            <span 
                className='srvHeaderName srvHeaderSortable'
                onClick={() => handleSort('serverName')}
            >
                Server { SortedIcon('serverName') }
            </span>

            <span 
                className='srvHeaderPing srvHeaderSortable' 
                onClick={() => handleSort('ping')}
            >
                Ping { SortedIcon('ping') }
            </span>

            <span 
                className='srvHeaderPlayers srvHeaderSortable' 
                onClick={() => handleSort('numPlayers')}
            >
                Players { SortedIcon('numPlayers') }
            </span>

            <span className='srvHeaderMode'>{recentsTab ? 'Played At' : 'Gamemode'}</span>
        </div> 
    );
}

export default ServerlistHeader;