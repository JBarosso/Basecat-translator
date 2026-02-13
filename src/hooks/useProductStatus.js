import { useState, useEffect, useCallback } from 'react';

export function useProductStatus(currentProductId, selectedLangs) {
    const [status, setStatus] = useState({
        sourceLangs: 0,
        targetLangs: 0,
        missingLangs: 0,
        ready: false,
        details: []
    });

    const checkStatus = useCallback(async () => {
        if (!currentProductId) return;

        try {
            const allTabs = await chrome.tabs.query({ currentWindow: true });
            const productTabs = allTabs.filter(t =>
                t.url &&
                t.url.includes('basecat/pim/product.php') &&
                t.url.includes(`id=${currentProductId}`)
            );

            const openedLangs = new Set();
            productTabs.forEach(t => {
                const url = new URL(t.url);
                const lang = url.searchParams.get('loc_data');
                if (lang) openedLangs.add(lang);
            });

            const targetLangsCount = selectedLangs.filter(l => openedLangs.has(l)).length;
            const sourceLangsCount = Array.from(openedLangs).filter(l => !selectedLangs.includes(l)).length;
            const missingLangsCount = selectedLangs.filter(l => !openedLangs.has(l)).length;

            setStatus({
                sourceLangs: sourceLangsCount,
                targetLangs: targetLangsCount,
                missingLangs: missingLangsCount,
                ready: sourceLangsCount > 0 && targetLangsCount > 0,
                openedLangs: Array.from(openedLangs)
            });

        } catch (error) {
            console.error('Error checking product status:', error);
        }
    }, [currentProductId, selectedLangs]);

    useEffect(() => {
        checkStatus();

        const listener = () => checkStatus();
        chrome.tabs.onUpdated.addListener(listener);
        chrome.tabs.onRemoved.addListener(listener);
        chrome.tabs.onCreated.addListener(listener);

        return () => {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.tabs.onRemoved.removeListener(listener);
            chrome.tabs.onCreated.removeListener(listener);
        };
    }, [checkStatus]);

    return status;
}
