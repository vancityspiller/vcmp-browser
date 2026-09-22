import { useEffect, useRef } from 'react';

/**
 * Runs a callback once, when the component unmounts.
 *
 * The callback is always the latest one rendered, so it sees current state
 * without the effect re-subscribing on every change.
 */
export function useUnmountEffect(callback) {

    const latest = useRef(callback);
    latest.current = callback;

    useEffect(() => () => latest.current(), []);
}
