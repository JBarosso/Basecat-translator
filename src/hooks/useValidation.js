import { useState, useCallback } from 'react';
import { getFormattedLanguageName } from '@/lib/languages';

export function useValidation() {
    const [validating, setValidating] = useState(false);
    const [progress, setProgress] = useState({});
    const [error, setError] = useState(null);

    const updateLangProgress = (productId, lang, status, percent, text) => {
        setProgress(prev => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                [lang]: { status, percent, text }
            }
        }));
    };

    const validateProduct = useCallback(async (productId, targetTabs) => {
        setValidating(true);
        setError(null);

        try {
            const promises = targetTabs.map(async ({ tab, langCode }) => {
                updateLangProgress(productId, langCode, 'active', 10, 'Démarrage...');

                try {
                    // 1. Navigation ur=V
                    updateLangProgress(productId, langCode, 'active', 30, 'Navigation...');

                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            const url = new URL(window.location.href);
                            if (url.searchParams.get('ur') !== 'V') {
                                url.searchParams.set('ur', 'V');
                                window.location.href = url.toString();
                            }
                        }
                    });

                    // Wait for reload
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // 2. Validate action trigger
                    updateLangProgress(productId, langCode, 'active', 60, 'Validation...');

                    // Trigger the validation message to the content script/background
                    await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage({
                            type: 'VALIDATE_CURRENT_PAGE',
                            tabId: tab.id
                        }, (response) => {
                            if (response && response.success) {
                                resolve();
                            } else {
                                reject(new Error(response?.error || 'Validation failed'));
                            }
                        });
                    });

                    // 3. Check status icons
                    updateLangProgress(productId, langCode, 'active', 80, 'Vérification...');
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const [result] = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            const photoIcon = document.querySelector('#photo_statusicon');
                            const descIcon = document.querySelector('#descriptif_statusicon');
                            const isPhotoValid = photoIcon && photoIcon.src && photoIcon.src.includes('checked.png');
                            const isDescValid = descIcon && descIcon.src && descIcon.src.includes('checked.png');
                            return { isPhotoValid, isDescValid };
                        }
                    });

                    const { isPhotoValid, isDescValid } = result.result;

                    if (isPhotoValid && isDescValid) {
                        updateLangProgress(productId, langCode, 'completed', 100, 'Validé');
                    } else {
                        updateLangProgress(productId, langCode, 'error', 100, 'Incomplet');
                    }

                } catch (err) {
                    console.error(`Error validating ${langCode}:`, err);
                    updateLangProgress(productId, langCode, 'error', 100, err.message);
                }
            });

            await Promise.all(promises);

        } catch (err) {
            console.error('Validation process error:', err);
            setError(err.message);
        } finally {
            setValidating(false);
        }
    }, []);

    return { validateProduct, validating, validationProgress: progress, validationError: error };
}
