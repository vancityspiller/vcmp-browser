import { useEffect, useRef } from 'react';

/**
 * Like useEffect, but skips the very first render.
 *
 * Used where an effect reacts to a value changing and must not fire for the
 * value it was initialised with.
 */
export function useAfterMount(effect, deps) {

    const mounted = useRef(false);

    useEffect(() => {
        if(!mounted.current) {
            mounted.current = true;
            return;
        }

        return effect();
        // the caller owns the dependency list
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
