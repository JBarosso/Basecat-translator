import { useState, useEffect } from 'react';

export function useChromeStorage(key, initialValue, area = 'sync') {
    const [storedValue, setStoredValue] = useState(initialValue);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        const fetchValue = async () => {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    const result = await chrome.storage[area].get(key);
                    if (mounted) {
                        setStoredValue(result[key] !== undefined ? result[key] : initialValue);
                        setStatus('ready');
                    }
                } else {
                    // Fallback for non-extension environment (dev)
                    const item = localStorage.getItem(key);
                    if (mounted) {
                        setStoredValue(item ? JSON.parse(item) : initialValue);
                        setStatus('ready');
                    }
                }
            } catch (e) {
                if (mounted) {
                    setError(e);
                    setStatus('error');
                    console.error(`Error loading ${key} from storage:`, e);
                }
            }
        };

        fetchValue();

        return () => {
            mounted = false;
        };
    }, [key, area, initialValue]);

    const setValue = async (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);

            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage[area].set({ [key]: valueToStore });
            } else {
                localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (e) {
            console.error(`Error saving ${key} to storage:`, e);
            setError(e);
        }
    };

    return [storedValue, setValue, status, error];
}
