import { useEffect, useState } from 'react';

/**
 * Custom hook to debounce rapidly changing values (such as search input queries).
 * @param value The value to debounce
 * @param delay Milliseconds to delay updating the debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
