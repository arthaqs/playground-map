import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useSyncedStorage<T>(key: string, defaultValue: T): [T, (val: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    supabase
      .from('app_data')
      .select('value')
      .eq('key', key)
      .single()
      .then(({ data }) => {
        if (data?.value != null) {
          const remote = data.value as T;
          setValue(remote);
          localStorage.setItem(key, JSON.stringify(remote));
        } else {
          // Supabase empty — push local data up so other devices can sync
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const local = JSON.parse(raw) as T;
              supabase
                .from('app_data')
                .upsert({ key, value: local, updated_at: new Date().toISOString() })
                .then();
            } catch {}
          }
        }
      });
  }, [key]);

  const set = useCallback((val: T) => {
    setValue(val);
    localStorage.setItem(key, JSON.stringify(val));
    supabase
      .from('app_data')
      .upsert({ key, value: val, updated_at: new Date().toISOString() })
      .then();
  }, [key]);

  return [value, set];
}
