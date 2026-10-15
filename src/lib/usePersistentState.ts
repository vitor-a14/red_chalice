import { useEffect, useState } from "react";

/** useState that mirrors its value to localStorage under `key`. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked; the app keeps working in memory.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
