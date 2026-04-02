import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3001';

const getStoreId = () => localStorage.getItem('activeStoreId') || 'store_primary';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(endpoint: string, interval: number = 0): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const storeId = getStoreId();
      const resp = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'X-Store-Id': storeId,
          'Content-Type': 'application/json',
        },
      });
      
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${resp.status}`);
      }
      
      const json = await resp.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
    if (interval > 0) {
      const timer = setInterval(fetchData, interval);
      return () => clearInterval(timer);
    }
  }, [fetchData, interval]);

  return { data, loading, error, refetch: fetchData };
}

export async function apiPost(endpoint: string, body: any) {
  const storeId = getStoreId();
  const resp = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Store-Id': storeId
    },
    body: JSON.stringify(body),
  });
  return resp.json();
}

export async function apiDelete(endpoint: string) {
  const storeId = getStoreId();
  const resp = await fetch(`${API_BASE}${endpoint}`, { 
    method: 'DELETE',
    headers: {
      'X-Store-Id': storeId
    }
  });
  return resp.json();
}
