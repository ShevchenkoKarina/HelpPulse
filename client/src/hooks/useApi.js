import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

/** Завантажує дані з API (порожній path = нічого не завантажувати): const { data, error, loading, reload } = useApi('/reports/summary') */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const load = useCallback(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return () => {};
    }
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path)
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((error) => active && setState({ data: null, error, loading: false }));
    return () => { active = false; };
  }, [path]);

  useEffect(() => load(), [load]);

  return { ...state, reload: load };
}
