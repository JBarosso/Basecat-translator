import { useState, useCallback } from 'react';
import { getLanguageByCode } from '@/lib/languages';

const GPT4O_MINI_INPUT_COST = 0.15 / 1000000;
const GPT4O_MINI_OUTPUT_COST = 0.60 / 1000000;

export function useTranslation(apiKey) {
    const [translating, setTranslating] = useState(false);
    const [progress, setProgress] = useState({}); // { [productKey]: { [lang]: { status, percent, text } } }
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

    const updateStats = async (langCode, inputTokens, outputTokens) => {
        try {
            const result = await chrome.storage.local.get('translationStats');
            let stats = result.translationStats || {
                totalTranslations: 0,
                totalCost: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                byLanguage: {},
                lastUpdated: new Date().toISOString()
            };

            const currentCost = (inputTokens * GPT4O_MINI_INPUT_COST) + (outputTokens * GPT4O_MINI_OUTPUT_COST);

            stats.totalTranslations += 1;
            stats.totalCost += currentCost;
            stats.totalInputTokens += inputTokens;
            stats.totalOutputTokens += outputTokens;

            if (!stats.byLanguage[langCode]) {
                stats.byLanguage[langCode] = { count: 0, cost: 0 };
            }
            stats.byLanguage[langCode].count += 1;
            stats.byLanguage[langCode].cost += currentCost;
            stats.lastUpdated = new Date().toISOString();

            await chrome.storage.local.set({ translationStats: stats });
            console.log('Stats updated:', stats);
        } catch (e) {
            console.error('Error updating stats:', e);
        }
    };

    const translateProduct = useCallback(async (productId, sourceTabId, targetTabs) => {
        if (!apiKey) {
            setError('Clé API manquante');
            return;
        }

        setTranslating(true);
        setError(null);

        try {
            const [sourceResult] = await chrome.scripting.executeScript({
                target: { tabId: sourceTabId },
                func: () => {
                    const title = document.querySelector('#item-titre-court')?.value || '';
                    let description = '';
                    const editorId = 'descriptif-long';
                    if (typeof CKEDITOR !== 'undefined' && CKEDITOR.instances[editorId]) {
                        description = CKEDITOR.instances[editorId].getData();
                    } else {
                        const iframe = document.querySelector('#cke_contents_descriptif-long iframe');
                        if (iframe && iframe.contentDocument) {
                            description = iframe.contentDocument.body.innerHTML;
                        }
                    }
                    const material = document.querySelector('#material')?.value || '';
                    return { title, description, material };
                }
            });

            const sourceData = sourceResult.result;

            const promises = targetTabs.map(async ({ tab, langCode }) => {
                const langInfo = getLanguageByCode(langCode);
                updateLangProgress(productId, langCode, 'translating', 10, 'Démarrage...');

                try {
                    const systemPrompt = `Tu es un expert en traduction de fiches produits pour un site e-commerce d'outillage professionnel.
Ton objectif est de traduire du contenu HTML du Français vers le ${langInfo.name}.
Règles strictes :
1. Conserve TOUTES les balises HTML intactes (ne les traduis pas, ne les déplace pas).
2. Traduis uniquement le texte visible.
3. Adapte le ton pour un public professionnel local.
4. Pour le "Matériau", si c'est un terme technique standard, utilise la traduction officielle.
5. Renvoie UNIQUEMENT un objet JSON valide avec la structure suivante, sans markdown ni autre texte :
{
    "title": "Titre traduit",
    "description": "Description HTML traduite",
    "material": "Matériau traduit (si présent)"
}`;

                    const userPrompt = JSON.stringify({
                        title: sourceData.title,
                        description: sourceData.description,
                        material: sourceData.material
                    });

                    updateLangProgress(productId, langCode, 'translating', 30, 'Connexion OpenAI...');

                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [
                                { role: "system", content: systemPrompt },
                                { role: "user", content: userPrompt }
                            ],
                            temperature: 0.3,
                            response_format: { type: "json_object" }
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error?.message || 'Erreur API OpenAI');
                    }

                    updateLangProgress(productId, langCode, 'translating', 70, 'Traitement...');

                    const data = await response.json();
                    const translatedContent = JSON.parse(data.choices[0].message.content);
                    const usage = data.usage;

                    // Update stats
                    if (usage) {
                        await updateStats(langCode, usage.prompt_tokens, usage.completion_tokens);
                    }

                    updateLangProgress(productId, langCode, 'injecting', 90, 'Injection...');

                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        args: [translatedContent, langCode],
                        func: (content, code) => {
                            const titleInput = document.querySelector('#item-titre-court');
                            if (titleInput) titleInput.value = content.title;

                            const editorId = 'descriptif-long';
                            if (typeof CKEDITOR !== 'undefined' && CKEDITOR.instances[editorId]) {
                                CKEDITOR.instances[editorId].setData(content.description);
                            } else {
                                const iframe = document.querySelector('#cke_contents_descriptif-long iframe');
                                if (iframe && iframe.contentDocument) {
                                    iframe.contentDocument.body.innerHTML = content.description;
                                }
                            }

                            const materialInput = document.querySelector('#material');
                            if (materialInput && content.material) {
                                materialInput.value = content.material;
                            }
                        }
                    });

                    updateLangProgress(productId, langCode, 'completed', 100, 'Terminé');

                } catch (err) {
                    console.error(`Error translating ${langCode}:`, err);
                    updateLangProgress(productId, langCode, 'error', 100, 'Erreur');
                }
            });

            await Promise.all(promises);

        } catch (err) {
            console.error('Translation process error:', err);
            setError(err.message);
        } finally {
            setTranslating(false);
        }
    }, [apiKey]);

    return { translateProduct, translating, progress, error };
}
