import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../utils/errors';

// Runs `fetcher` whenever `deps` change. Keeps the previous data on screen while
// the next page / filter loads, and exposes reload() for retry buttons.
export default function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    fetcher()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: '' }); })
      .catch((err) => { if (!cancelled) setState({ data: null, loading: false, error: getErrorMessage(err) }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
