import { useEffect } from 'react';

// --------------------------------------------------------- //

// how far the list scrolls per key press
const SCROLL_STEP = 30;

/**
 * Arrow keys scroll the list, and move the selection when a server is open.
 *
 * @param {Object}   options
 * @param {Object[]} options.rows Currently displayed rows
 * @param {?Object}  options.selected Selected server, if any
 * @param {boolean}  options.active Whether selection should follow the keys
 * @param {Object}   options.listRef Ref to the scrolling container
 * @param {function} options.onSelect Called with the index to select
 */
export function useListKeyboard({rows, selected, active, listRef, onSelect}) {

    useEffect(() => {

        const onKeyDown = event => {

            if(event.ctrlKey) return;

            const direction =
                event.key === 'ArrowDown' ? 1 :
                event.key === 'ArrowUp' ? -1 : 0;

            if(direction === 0) return;

            // --------------------------------------------------------- //

            if(active && selected) {
                const current = rows.findIndex(v => v.ip === selected.ip);
                const next = current + direction;

                if(current !== -1 && next >= 0 && next < rows.length) {
                    // don't re-query while stepping through, it desynchronises
                    // the row being shown from the one being fetched
                    onSelect(next, true);
                }
            }

            listRef.current?.scrollBy({top: direction * SCROLL_STEP, behavior: 'smooth'});
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);

    }, [rows, selected, active, listRef, onSelect]);
}
