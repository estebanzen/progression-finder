import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Use state initializer function to read from localStorage synchronously on first render
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        // We'll store strings directly if T is string, but JSON parsing is safer for generic types
        try {
          return JSON.parse(item);
        } catch {
          // If JSON parse fails, maybe it was a plain string stored previously
          return item as unknown as T;
        }
      }
      return defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof storedValue === 'string') {
        window.localStorage.setItem(key, storedValue);
      } else {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
