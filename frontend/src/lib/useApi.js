import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFnRef = useRef(fetchFn);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const reload = useCallback(() => {
    setLoading(true);
    fetchFnRef.current()
      .then((res) => {
        setData(res);
        setError('');
      })
      .catch((err) => {
        setError(err?.message || 'An error occurred');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchFnRef.current()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'An error occurred');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, setData, loading, error, reload };
}
