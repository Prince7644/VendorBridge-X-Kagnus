import { useCallback, useEffect, useRef, useState } from 'react';

// Short-lived success / error banner state.
export default function useNotice(timeout = 5000) {
  const [notice, setNotice] = useState(null);
  const timer = useRef(null);
  const show = useCallback((type, message) => {
    clearTimeout(timer.current);
    setNotice({ type, message });
    if (type === 'success') timer.current = setTimeout(() => setNotice(null), timeout);
  }, [timeout]);
  const clear = useCallback(() => setNotice(null), []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { notice, show, clear };
}
