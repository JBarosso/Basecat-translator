import { useState, useEffect } from 'react';

export function useCurrentPage() {
    const [pageInfo, setPageInfo] = useState({
        isBasecat: false,
        productId: null,
        lang: null,
        url: '',
        loading: true
    });

    useEffect(() => {
        const checkCurrentTab = async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab?.url) return;

                const isBasecat = tab.url.includes('basecat/pim/product.php');
                let productId = null;
                let lang = null;

                if (isBasecat) {
                    const url = new URL(tab.url);
                    productId = url.searchParams.get('id');
                    lang = url.searchParams.get('loc_data');
                }

                setPageInfo({
                    isBasecat,
                    productId,
                    lang: lang || 'Non détectée',
                    url: tab.url,
                    loading: false
                });
            } catch (error) {
                console.error('Error checking current tab:', error);
                setPageInfo(prev => ({ ...prev, loading: false }));
            }
        };

        checkCurrentTab();

        const listener = (tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' || changeInfo.url) {
                checkCurrentTab();
            }
        };

        const activatedListener = () => {
            checkCurrentTab();
        };

        chrome.tabs.onUpdated.addListener(listener);
        chrome.tabs.onActivated.addListener(activatedListener);

        return () => {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.tabs.onActivated.removeListener(activatedListener);
        };
    }, []);

    return pageInfo;
}
