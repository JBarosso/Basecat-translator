// ========================================
// SYSTÈME DE PROGRESSION PAR PRODUIT
// ========================================

import { LANGUAGES, getLanguageByShortCode, getLanguageByCode, getLanguageName, getFormattedLanguageName, createEmptyLangTabs } from './languages-config.js';

// Stocker les produits en cours
const activeProducts = new Map();

function getProductKey(productId, type) {
    return `${productId}-${type}`;
}

// Fonction pour convertir HSL en RGB
function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatique
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Fonction pour calculer la luminosité relative perçue d'une couleur
function getLuminance(r, g, b) {
    // Formule de luminosité relative perçue (WCAG)
    return (0.299 * r + 0.587 * g + 0.114 * b);
}

// Fonction pour déterminer la couleur du texte (noir ou blanc) selon le fond
function getTextColorForBackground(color) {
    // Extraire les valeurs HSL de la couleur
    const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!hslMatch) {
        // Si ce n'est pas HSL, vérifier si c'est un hex
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            const luminance = getLuminance(r, g, b);
            return luminance > 128 ? '#000000' : '#FFFFFF';
        }
        // Sinon, retourner blanc par défaut
        return '#FFFFFF';
    }

    const h = parseInt(hslMatch[1]);
    const s = parseInt(hslMatch[2]);
    const l = parseInt(hslMatch[3]);

    // Convertir HSL en RGB
    const [r, g, b] = hslToRgb(h, s, l);

    // Calculer la luminosité
    const luminance = getLuminance(r, g, b);

    // Si la luminosité est supérieure à 128, utiliser du texte noir, sinon blanc
    return luminance > 128 ? '#000000' : '#FFFFFF';
}

async function createProductProgressGroup(productId, languages, type = 'translation') {
    const key = getProductKey(productId, type);

    if (activeProducts.has(key)) {
        return activeProducts.get(key);
    }

    const container = document.getElementById('progressProducts');
    const emptyMessage = document.getElementById('progressEmpty');
    emptyMessage.classList.add('hidden');

    let productColor = '#2563eb';
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'GET_PRODUCT_COLOR',
            productId: productId
        });
        if (response && response.color) {
            productColor = response.color;
        }
    } catch (error) {
        console.warn('Impossible de récupérer la couleur du produit:', error);
    }

    const productGroup = document.createElement('div');
    productGroup.className = 'product-progress-group';
    productGroup.id = `product-${key}`;

    // Calculer la couleur du texte selon la luminosité du fond
    const textColor = getTextColorForBackground(productColor);
    
    const header = document.createElement('div');
    header.className = 'product-progress-header';
    header.innerHTML = `
        <div class="product-progress-title">
            <span class="product-progress-id" style="background: ${productColor}; color: ${textColor};">${productId}</span>
            <span class="product-progress-type">${type === 'translation' ? '🌐 Traduction' : '✅ Validation'}</span>
        </div>
    `;

    const barsContainer = document.createElement('div');
    barsContainer.className = 'product-progress-bars';

    languages.forEach(lang => {
        const langShort = lang.code.split('_')[0];
        const langInfo = getLanguageByShortCode(langShort);

        if (!langInfo) {
            console.warn(`Langue non supportée: ${langShort}`);
            return;
        }

        const barContainer = document.createElement('div');
        barContainer.className = 'progress-bar-container';
        barContainer.id = `progress-${key}-${langShort}`;
        barContainer.innerHTML = `
        <div class="progress-bar-header">
            <span class="progress-bar-flag">${langInfo.flag}</span>
            <span class="progress-bar-label">${langInfo.name}</span>
            <span class="progress-bar-status" id="progress-${key}-${langShort}-status">En attente</span>
        </div>
        <div class="progress-bar-track">
            <div class="progress-bar-fill ${langShort}" id="progress-${key}-${langShort}-fill"></div>
        </div>
    `;

        barsContainer.appendChild(barContainer);
    });

    productGroup.appendChild(header);
    productGroup.appendChild(barsContainer);
    container.appendChild(productGroup);

    const groupData = { element: productGroup, languages: languages, type: type };
    activeProducts.set(key, groupData);

    return groupData;
}

function updateProductProgressBar(productId, langCode, step, type = 'translation') {
    const key = getProductKey(productId, type);
    const langShort = langCode.split('_')[0];

    const fill = document.getElementById(`progress-${key}-${langShort}-fill`);
    const status = document.getElementById(`progress-${key}-${langShort}-status`);

    if (!fill || !status) {
        console.warn(`Progress bar introuvable pour ${key}-${langShort}`);
        return;
    }

    const steps = type === 'translation' ? {
        'start': { width: '10%', text: 'Démarrage...' },
        'extracting': { width: '25%', text: 'Extraction FR...' },
        'translating-title': { width: '40%', text: 'Traduction titre...' },
        'translating-description': { width: '60%', text: 'Traduction description...' },
        'translating-material': { width: '75%', text: 'Traduction matériau...' },
        'injecting': { width: '90%', text: 'Injection...' },
        'completed': { width: '100%', text: '✓ Terminé' },
        'error': { width: '100%', text: '✗ Erreur' }
    } : {
        'start': { width: '10%', text: 'Démarrage...' },
        'saving': { width: '30%', text: 'Enregistrement...' },
        'navigating': { width: '50%', text: 'Navigation ur=V...' },
        'validating-photos': { width: '70%', text: 'Validation photos...' },
        'validating-description': { width: '90%', text: 'Validation description...' },
        'completed': { width: '100%', text: '✓ Validé' },
        'error': { width: '100%', text: '✗ Erreur' }
    };

    const stepData = steps[step];
    if (stepData) {
        fill.style.width = stepData.width;
        status.textContent = stepData.text;

        if (step === 'completed') {
            fill.classList.add('completed');
        }
    }
}

function removeProductProgressGroup(productId, type, delay = 3000) {
    setTimeout(() => {
        const key = getProductKey(productId, type);
        const groupData = activeProducts.get(key);

        if (groupData) {
            groupData.element.style.opacity = '0';
            groupData.element.style.transform = 'translateY(-10px)';
            groupData.element.style.transition = 'all 0.3s ease';

            setTimeout(() => {
                groupData.element.remove();
                activeProducts.delete(key);

                if (activeProducts.size === 0) {
                    document.getElementById('progressEmpty').classList.remove('hidden');
                }
            }, 300);
        }
    }, delay);
}

let currentTranslationProduct = null;
let currentValidationProduct = null;

// ========================================
// INITIALISATION
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    const { openaiApiKey } = await chrome.storage.sync.get('openaiApiKey');
    if (openaiApiKey) {
        document.getElementById('apiKey').value = openaiApiKey;
    }

    // Générer dynamiquement les checkboxes de langues
    generateLanguageCheckboxes();

    updateCurrentPage();
    updatePagesStatus();
    hideEmptyFieldsSection();
    displayStats();
});

function generateLanguageCheckboxes() {
    const container = document.getElementById('languageCheckboxes');
    if (!container) return;

    container.innerHTML = '';

    LANGUAGES.forEach(lang => {
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'checkbox-item';
        checkboxItem.innerHTML = `
            <input type="checkbox" id="lang-${lang.shortCode}" value="${lang.code}" ${lang.defaultChecked ? 'checked' : ''}>
            <label for="lang-${lang.shortCode}">${lang.flag} ${lang.shortCode.toUpperCase()}</label>
        `;
        container.appendChild(checkboxItem);
    });
}

// ========================================
// GESTION API KEY
// ========================================

document.getElementById('saveApiBtn').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const statusDiv = document.getElementById('apiStatus');

    if (!apiKey) {
        showStatus(statusDiv, 'error', 'Veuillez entrer une clé API');
        return;
    }

    if (!apiKey.startsWith('sk-')) {
        showStatus(statusDiv, 'error', 'Format invalide (doit commencer par sk-)');
        return;
    }

    await chrome.storage.sync.set({ openaiApiKey: apiKey });
    showStatus(statusDiv, 'success', 'Clé API enregistrée');
});

document.getElementById('colorizeBtn').addEventListener('click', async () => {
    chrome.runtime.sendMessage({ type: 'COLORIZE_TABS' }, (response) => {
        if (response.success) {
            showStatus(document.getElementById('apiStatus'), 'success', '🎨 Onglets colorisés !');
        } else {
            showStatus(document.getElementById('apiStatus'), 'error', 'Erreur: ' + response.error);
        }
    });
});

// ========================================
// GESTION DES CHAMPS VIDES
// ========================================

function hideEmptyFieldsSection() {
    const emptySection = document.querySelector('.empty-section');
    emptySection.style.display = 'none';
}

function showEmptyFieldsSection(emptyFields) {
    const emptySection = document.querySelector('.empty-section');
    const emptyContent = emptySection.querySelector('.section-content');

    if (emptyFields.length === 0) {
        hideEmptyFieldsSection();
        return;
    }

    emptySection.style.display = 'block';

    let html = '<div class="empty-fields-list">';

    emptyFields.forEach(field => {
        const langDisplay = getFormattedLanguageName(field.lang);

        const fieldNames = {
            'title': 'Titre',
            'description': 'Description',
            'material': 'Matériau'
        };

        html += `
            <div class="empty-field-item">
                <span class="empty-field-lang">${langDisplay}</span>
                <span class="empty-field-name">${fieldNames[field.field]}</span>
                <span class="empty-field-icon">⚠️</span>
            </div>
        `;
    });

    html += '</div>';
    emptyContent.innerHTML = html;
}

async function checkEmptyFields(tabId, langCode, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`🔍 Vérification champs vides - Tentative ${attempt}/${maxRetries}`);

        const [result] = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            world: 'MAIN',
            func: () => {
                const emptyFields = [];

                const titleInput = document.querySelector('#item-titre-court');
                if (titleInput && (!titleInput.value || titleInput.value.trim().length === 0)) {
                    emptyFields.push('title');
                }

                const editorId = 'descriptif-long';
                let descriptionEmpty = false;

                if (typeof CKEDITOR !== 'undefined' && CKEDITOR.instances[editorId]) {
                    const editor = CKEDITOR.instances[editorId];
                    const data = editor.getData();

                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = data;
                    const textContent = tempDiv.textContent || tempDiv.innerText || '';

                    if (textContent.trim().length < 3) {
                        descriptionEmpty = true;
                    }
                } else {
                    const iframe = document.querySelector('#cke_contents_descriptif-long iframe');
                    if (iframe && iframe.contentDocument) {
                        const description = iframe.contentDocument.body.innerHTML;
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = description;
                        const textContent = tempDiv.textContent || tempDiv.innerText || '';

                        if (textContent.trim().length < 3) {
                            descriptionEmpty = true;
                        }
                    }
                }

                if (descriptionEmpty) {
                    emptyFields.push('description');
                }

                const materialInput = document.querySelector('#material');
                if (materialInput) {
                    const shouldHaveMaterial = materialInput.hasAttribute('data-should-have-material');
                    const materialValue = materialInput.value ? materialInput.value.trim() : '';

                    if (shouldHaveMaterial && materialValue.length === 0) {
                        emptyFields.push('material');
                        console.warn('⚠️ Matériau devrait être rempli mais est vide');
                    }
                }

                console.log('🔍 Champs vides détectés:', emptyFields);
                return emptyFields;
            }
        });

        const emptyFields = result.result;

        if (emptyFields.length === 0 || attempt === maxRetries) {
            return emptyFields.map(field => ({ lang: langCode, field: field }));
        }

        await new Promise(r => setTimeout(r, 1000));
    }
}

// ========================================
// GESTION DES PAGES
// ========================================

async function updatePagesStatus() {
    const allTabs = await chrome.tabs.query({ currentWindow: true });
    const basecatTabs = allTabs.filter(t =>
        t.url && t.url.includes('basecat/pim/product.php')
    );

    const productGroups = {};
    basecatTabs.forEach(tab => {
        const url = new URL(tab.url);
        const productId = url.searchParams.get('id');
        const locData = url.searchParams.get('loc_data');

        if (!productId) return;

        if (!productGroups[productId]) {
            productGroups[productId] = {};
        }
        productGroups[productId][locData] = tab;
    });

    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let currentProductId = null;
    if (currentTab.url && currentTab.url.includes('basecat/pim/product.php')) {
        const currentUrl = new URL(currentTab.url);
        currentProductId = currentUrl.searchParams.get('id');
    }

    const currentProduct = currentProductId ? productGroups[currentProductId] : {};
    const foundLangs = new Set(Object.keys(currentProduct));

    const allLangs = Array.from(foundLangs);
    
    // Détecter la langue source (celle qui est différente des langues cibles sélectionnées)
    const checkedLangs = [];
    document.querySelectorAll('.checkbox-item input[type="checkbox"]:checked').forEach(cb => {
        checkedLangs.push(cb.value);
    });
    
    // Les langues cibles sont celles qui sont cochées ET ouvertes
    const targetLangs = checkedLangs.filter(lang => foundLangs.has(lang));
    const targetLangsCount = targetLangs.length;

    const allCheckedLangsOpen = checkedLangs.every(lang => foundLangs.has(lang));

    const translateAllBtn = document.getElementById('translateAllBtn');
    const validateAllBtn = document.getElementById('validateAllBtn');
    const translateAllStatusDiv = document.getElementById('translateAllStatus');

    // Pour traduire, il faut au moins une langue source (non cochée) et une langue cible (cochée)
    const sourceLangs = allLangs.filter(lang => !checkedLangs.includes(lang));
    const hasSource = sourceLangs.length > 0;
    
    translateAllBtn.disabled = !hasSource || targetLangsCount === 0;
    validateAllBtn.disabled = targetLangsCount === 0;

    if (!currentProductId) {
        showStatus(translateAllStatusDiv, 'info', 'Sélectionnez un produit Basecat');
    } else if (!hasSource) {
        showStatus(translateAllStatusDiv, 'error', 'Ouvrez au moins une langue source (non cochée)');
    } else if (targetLangsCount === 0) {
        showStatus(translateAllStatusDiv, 'info', 'Ouvrez au moins une langue cible (cochée)');
    } else if (!allCheckedLangsOpen) {
        showStatus(
            translateAllStatusDiv,
            'warning',
            `⚠️ ${checkedLangs.length - targetLangs.filter(l => checkedLangs.includes(l)).length} langue(s) cochée(s) non ouverte(s)`
        );
    } else {
        showStatus(
            translateAllStatusDiv,
            'success',
            `✓ Prêt : ${sourceLangs.length} source(s), ${targetLangsCount} cible(s)`
        );
    }
}

async function updateCurrentPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const langDisplayContainer = document.querySelector('.current-page-content');
    const langDisplay = document.getElementById('currentLanguage');

    if (!tab.url.includes('basecat/pim/product.php')) {
        langDisplay.textContent = 'Pas sur une page Basecat';
        langDisplayContainer.style.backgroundColor = '#fff3cd';
        langDisplayContainer.style.borderColor = '#ffc107';
        return;
    }

    const url = new URL(tab.url);
    const locData = url.searchParams.get('loc_data');
    const productId = url.searchParams.get('id');

    const langText = getFormattedLanguageName(locData) || locData || 'Non détectée';
    const productText = productId ? ` (ID: ${productId})` : '';

    langDisplay.textContent = langText + productText;
    langDisplayContainer.style.backgroundColor = locData === 'fr_FR' ? '#e8d5ff' : '#fff3cd';
    langDisplayContainer.style.borderColor = locData === 'fr_FR' ? '#9C27B0' : '#ffc107';
}

function getLangName(code) {
    return getLanguageName(code);
}

function showStatus(element, type, message) {
    element.className = `status ${type}`;
    element.textContent = message;
}

// ========================================
// BOUTON: ÉTAPE DE VALIDATION
// ========================================

document.getElementById('saveBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('saveStatus');
    const btn = document.getElementById('saveBtn');

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.url || !tab.url.includes('basecat/pim/product.php')) {
            showStatus(statusDiv, 'error', 'Vous devez être sur une page Basecat');
            return;
        }

        btn.disabled = true;
        showStatus(statusDiv, 'info', 'Navigation vers l\'étape de validation...');

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const url = new URL(window.location.href);
                url.searchParams.set('ur', 'V');
                window.location.href = url.toString();
            }
        });

        await new Promise((resolve) => {
            const listener = (changedTabId, changeInfo) => {
                if (changedTabId === tab.id && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            chrome.tabs.onUpdated.addListener(listener);

            setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }, 5000);
        });

        showStatus(statusDiv, 'success', '✅ Navigation vers l\'étape de validation réussie');
        btn.disabled = false;

    } catch (error) {
        showStatus(statusDiv, 'error', 'Erreur: ' + error.message);
        btn.disabled = false;
    }
});

// ========================================
// BOUTON: OUVRIR LES LANGUES
// ========================================

document.getElementById('openLanguagesBtn').addEventListener('click', async () => {
    const selectedLangs = [];
    document.querySelectorAll('.checkbox-item input[type="checkbox"]:checked').forEach(cb => {
        selectedLangs.push(cb.value);
    });

    if (selectedLangs.length === 0) {
        showStatus(document.getElementById('translateAllStatus'), 'error', 'Sélectionnez au moins une langue');
        return;
    }

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = new URL(tab.url);

        for (const langCode of selectedLangs) {
            const newUrl = new URL(currentUrl.href);
            newUrl.searchParams.set('loc_data', langCode);
            await chrome.tabs.create({ url: newUrl.href, active: false });
        }

        setTimeout(updatePagesStatus, 1000);
    } catch (error) {
        showStatus(document.getElementById('translateAllStatus'), 'error', 'Erreur: ' + error.message);
    }
});

// ========================================
// BOUTON: TRADUIRE TOUTES LES LANGUES (VERSION PARALLÈLE)
// ========================================

document.getElementById('translateAllBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('translateAllStatus');
    const btn = document.getElementById('translateAllBtn');

    try {
        const { openaiApiKey } = await chrome.storage.sync.get('openaiApiKey');
        if (!openaiApiKey) {
            showStatus(statusDiv, 'error', '⚠️ Configurez d\'abord votre clé API');
            return;
        }

        btn.disabled = true;
        showStatus(statusDiv, 'info', 'Recherche des onglets à traduire...');

        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!currentTab.url || !currentTab.url.includes('basecat/pim/product.php')) {
            showStatus(statusDiv, 'error', 'Vous devez être sur une page Basecat');
            btn.disabled = false;
            return;
        }

        const currentUrl = new URL(currentTab.url);
        const currentProductId = currentUrl.searchParams.get('id');

        if (!currentProductId) {
            showStatus(statusDiv, 'error', 'ID produit introuvable');
            btn.disabled = false;
            return;
        }

        currentTranslationProduct = currentProductId;

        const allTabs = await chrome.tabs.query({ currentWindow: true });
        const productTabs = allTabs.filter(t => {
            if (!t.url || !t.url.includes('basecat/pim/product.php')) return false;
            const url = new URL(t.url);
            return url.searchParams.get('id') === currentProductId;
        });

        if (productTabs.length === 0) {
            showStatus(statusDiv, 'error', 'Aucun onglet trouvé pour ce produit');
            btn.disabled = false;
            return;
        }

        const langTabs = createEmptyLangTabs();

        productTabs.forEach(tab => {
            const url = new URL(tab.url);
            const locData = url.searchParams.get('loc_data');
            if (langTabs.hasOwnProperty(locData)) {
                langTabs[locData] = tab;
            }
        });

        // Trouver les langues sources (non cochées) et cibles (cochées)
        const checkedLangs = [];
        document.querySelectorAll('.checkbox-item input[type="checkbox"]:checked').forEach(cb => {
            checkedLangs.push(cb.value);
        });

        const sourceTabs = [];
        const toTranslate = [];

        // Les langues sources sont celles qui sont ouvertes mais non cochées
        Object.entries(langTabs).forEach(([code, tab]) => {
            if (tab && !checkedLangs.includes(code)) {
                sourceTabs.push({ code, tab });
            } else if (tab && checkedLangs.includes(code)) {
                toTranslate.push({ code, name: getLangName(code), tab });
            }
        });

        if (sourceTabs.length === 0) {
            showStatus(statusDiv, 'error', 'Ouvrez au moins une langue source (non cochée) pour ce produit.');
            btn.disabled = false;
            return;
        }

        if (toTranslate.length === 0) {
            showStatus(statusDiv, 'error', 'Aucune langue cible (cochée) à traduire pour ce produit.');
            btn.disabled = false;
            return;
        }

        hideEmptyFieldsSection();
        await createProductProgressGroup(currentProductId, toTranslate, 'translation');
        showStatus(statusDiv, 'info', `Traduction de ${toTranslate.length} langue(s) en parallèle...`);

        const translationPromises = toTranslate.map(lang => {
            return new Promise((resolve, reject) => {
                updateProductProgressBar(currentProductId, lang.code, 'start', 'translation');
                setTimeout(() => updateProductProgressBar(currentProductId, lang.code, 'extracting', 'translation'), 500);
                setTimeout(() => updateProductProgressBar(currentProductId, lang.code, 'translating-title', 'translation'), 1500);
                setTimeout(() => updateProductProgressBar(currentProductId, lang.code, 'translating-description', 'translation'), 2500);
                setTimeout(() => updateProductProgressBar(currentProductId, lang.code, 'translating-material', 'translation'), 3500);
                setTimeout(() => updateProductProgressBar(currentProductId, lang.code, 'injecting', 'translation'), 4500);

                // Utiliser la première langue source disponible
                const sourceTab = sourceTabs[0].tab;

                chrome.runtime.sendMessage({
                    type: 'TRANSLATE_PAGE',
                    tabId: lang.tab.id,
                    frTabId: sourceTab.id,
                    apiKey: openaiApiKey
                }, (response) => {
                    if (response.success) {
                        updateProductProgressBar(currentProductId, lang.code, 'completed', 'translation');
                        console.log(`✅ ${lang.name} traduit avec succès`);
                        resolve({ lang: lang.code, success: true });
                    } else {
                        updateProductProgressBar(currentProductId, lang.code, 'error', 'translation');
                        console.error(`❌ Erreur ${lang.name}:`, response.error);
                        reject(new Error(`${lang.name}: ${response.error}`));
                    }
                });
            });
        });

        try {
            const results = await Promise.allSettled(translationPromises);
            const successes = results.filter(r => r.status === 'fulfilled').length;
            const failures = results.filter(r => r.status === 'rejected').length;

            console.log(`📊 Résultats: ${successes} réussies, ${failures} échouées`);

            if (failures > 0) {
                showStatus(statusDiv, 'warning', `⚠️ ${successes}/${toTranslate.length} langue(s) traduites (${failures} erreur(s))`);
            } else {
                showStatus(statusDiv, 'success', `✅ ${toTranslate.length} langue(s) traduites en parallèle !`);
            }

        } catch (error) {
            showStatus(statusDiv, 'error', 'Erreur lors des traductions: ' + error.message);
        }


        console.log('🔍 Début de la vérification en parallèle de toutes les langues...');
        showStatus(statusDiv, 'info', `Vérification des ${toTranslate.length} langue(s)...`);
        await new Promise(r => setTimeout(r, 2000));

        const verificationPromises = toTranslate.map(lang =>
            checkEmptyFields(lang.tab.id, lang.code)
        );

        const allEmptyFieldsArrays = await Promise.all(verificationPromises);
        const allEmptyFields = allEmptyFieldsArrays.flat();

        console.log('✅ Vérification terminée:', allEmptyFields);

        removeProductProgressGroup(currentProductId, 'translation', 3000);

        if (allEmptyFields.length > 0) {
            showEmptyFieldsSection(allEmptyFields);
        }

        btn.disabled = false;

    } catch (error) {
        showStatus(statusDiv, 'error', 'Erreur: ' + error.message);
        btn.disabled = false;
        if (currentTranslationProduct) {
            removeProductProgressGroup(currentTranslationProduct, 'translation', 1000);
        }
    }
});

// ========================================
// BOUTON: TRADUIRE PAGE COURANTE
// ========================================

document.getElementById('translateBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('translateStatus');

    showStatus(statusDiv, 'info', 'Traduction en cours...');
    hideEmptyFieldsSection();

    try {
        const { openaiApiKey } = await chrome.storage.sync.get('openaiApiKey');
        if (!openaiApiKey) {
            showStatus(statusDiv, 'error', '⚠️ Configurez d\'abord votre clé API');
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = new URL(tab.url);
        const locData = url.searchParams.get('loc_data');
        const productId = url.searchParams.get('id');

        if (!productId || !locData) {
            showStatus(statusDiv, 'error', 'Vous devez être sur une page produit Basecat');
            return;
        }

        // Créer la barre de progression pour cette langue
        const language = { code: locData, name: getLangName(locData) };
        await createProductProgressGroup(productId, [language], 'translation');

        // Démarrer la progression
        updateProductProgressBar(productId, locData, 'start', 'translation');
        setTimeout(() => updateProductProgressBar(productId, locData, 'extracting', 'translation'), 500);
        setTimeout(() => updateProductProgressBar(productId, locData, 'translating-title', 'translation'), 1500);
        setTimeout(() => updateProductProgressBar(productId, locData, 'translating-description', 'translation'), 2500);
        setTimeout(() => updateProductProgressBar(productId, locData, 'translating-material', 'translation'), 3500);
        setTimeout(() => updateProductProgressBar(productId, locData, 'injecting', 'translation'), 4500);

        chrome.runtime.sendMessage({
            type: 'TRANSLATE_PAGE',
            tabId: tab.id,
            apiKey: openaiApiKey
        }, async (response) => {
            if (response.success) {
                updateProductProgressBar(productId, locData, 'completed', 'translation');
                showStatus(statusDiv, 'success', '✅ Traduction terminée et injectée');
                updateCurrentPage();

                const emptyFields = await checkEmptyFields(tab.id, locData);
                if (emptyFields.length > 0) {
                    showEmptyFieldsSection(emptyFields);
                }

                // Supprimer la barre de progression après 3 secondes
                removeProductProgressGroup(productId, 'translation', 3000);
            } else {
                updateProductProgressBar(productId, locData, 'error', 'translation');
                showStatus(statusDiv, 'error', 'Erreur: ' + response.error);
                
                // Supprimer la barre de progression après 2 secondes en cas d'erreur
                removeProductProgressGroup(productId, 'translation', 2000);
            }
        });

    } catch (error) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
            const url = new URL(tab.url);
            const productId = url.searchParams.get('id');
            if (productId) {
                removeProductProgressGroup(productId, 'translation', 1000);
            }
        }
        showStatus(statusDiv, 'error', 'Erreur: ' + error.message);
    }
});

// ========================================
// BOUTON: VALIDER PAGE COURANTE
// ========================================

document.getElementById('validateCurrentBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('validateStatus');
    const btn = document.getElementById('validateCurrentBtn');

    showStatus(statusDiv, 'info', 'Validation en cours...');
    btn.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.url || !tab.url.includes('basecat/pim/product.php')) {
            showStatus(statusDiv, 'error', 'Vous devez être sur une page Basecat');
            btn.disabled = false;
            return;
        }

        const url = new URL(tab.url);
        const locData = url.searchParams.get('loc_data');
        const productId = url.searchParams.get('id');
        const currentUr = url.searchParams.get('ur');

        currentValidationProduct = productId;

        const language = { code: locData, name: 'Page actuelle' };
        await createProductProgressGroup(productId, [language], 'validation');

        updateProductProgressBar(productId, locData, 'start', 'validation');

        setTimeout(() => updateProductProgressBar(productId, locData, 'saving', 'validation'), 500);
        setTimeout(() => updateProductProgressBar(productId, locData, 'navigating', 'validation'), 2000);
        setTimeout(() => updateProductProgressBar(productId, locData, 'validating-photos', 'validation'), 4000);
        setTimeout(() => updateProductProgressBar(productId, locData, 'validating-description', 'validation'), 6000);

        if (currentUr !== 'V') {
            console.log('📍 Navigation vers ur=V...');
            showStatus(statusDiv, 'info', 'Navigation vers la page de validation...');

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('ur', 'V');
                    window.location.href = url.toString();
                }
            });

            await new Promise((resolve) => {
                const listener = (changedTabId, changeInfo) => {
                    if (changedTabId === tab.id && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        console.log('✅ Page ur=V chargée');
                        resolve();
                    }
                };
                chrome.tabs.onUpdated.addListener(listener);

                setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }, 5000);
            });

            await new Promise(r => setTimeout(r, 1000));
        }

        showStatus(statusDiv, 'info', 'Validation en cours...');

        chrome.runtime.sendMessage({
            type: 'VALIDATE_CURRENT_PAGE',
            tabId: tab.id
        }, (response) => {
            if (response.success) {
                updateProductProgressBar(productId, locData, 'completed', 'validation');
                showStatus(statusDiv, 'success', '✅ Page validée avec succès');
                removeProductProgressGroup(productId, 'validation', 2000);
            } else {
                updateProductProgressBar(productId, locData, 'error', 'validation');
                showStatus(statusDiv, 'error', 'Erreur: ' + response.error);
                removeProductProgressGroup(productId, 'validation', 2000);
            }
            btn.disabled = false;
        });

    } catch (error) {
        showStatus(statusDiv, 'error', 'Erreur: ' + error.message);
        btn.disabled = false;
        if (currentValidationProduct) {
            removeProductProgressGroup(currentValidationProduct, 'validation', 1000);
        }
    }
});

document.getElementById('validateAllBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('validateStatus');
    const btn = document.getElementById('validateAllBtn');

    showStatus(statusDiv, 'info', 'Validation de toutes les pages...');
    btn.disabled = true;

    try {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = new URL(currentTab.url);
        const currentProductId = currentUrl.searchParams.get('id');
        const currentLocData = currentUrl.searchParams.get('loc_data');

        if (!currentProductId) {
            showStatus(statusDiv, 'error', 'ID produit introuvable');
            btn.disabled = false;
            return;
        }

        currentValidationProduct = currentProductId;

        const allTabs = await chrome.tabs.query({ currentWindow: true });
        const productTabs = allTabs.filter(t => {
            if (!t.url || !t.url.includes('basecat/pim/product.php')) return false;
            const url = new URL(t.url);
            return url.searchParams.get('id') === currentProductId;
        });

        const langTabs = createEmptyLangTabs();

        productTabs.forEach(tab => {
            const url = new URL(tab.url);
            const locData = url.searchParams.get('loc_data');
            if (langTabs.hasOwnProperty(locData)) {
                langTabs[locData] = tab;
            }
        });

        const toValidate = [];
        LANGUAGES.forEach(lang => {
            if (langTabs[lang.code]) {
                toValidate.push({ 
                    code: lang.code, 
                    name: lang.name, 
                    tab: langTabs[lang.code] 
                });
            }
        });

        // Exclure la langue de l'onglet actif (langue initiale)
        const filteredToValidate = toValidate.filter(lang => lang.code !== currentLocData);

        if (filteredToValidate.length === 0) {
            showStatus(statusDiv, 'error', 'Aucune page à valider (toutes les langues sauf la langue initiale)');
            btn.disabled = false;
            return;
        }

        // ✅ MODIFIÉ : Ajout de await
        await createProductProgressGroup(currentProductId, filteredToValidate, 'validation');

        showStatus(statusDiv, 'info', `Validation de ${filteredToValidate.length} langue(s) en parallèle...`);

        const validationPromises = filteredToValidate.map(lang => {
            return new Promise((resolve, reject) => {
                updateProductProgressBar(currentProductId, lang.code, 'start', 'validation');
                setTimeout(() => updateProductProgressBar(currentProductId, lang.code, 'saving', 'validation'), 500);
                setTimeout(() => updateProductProgressBar(currentProductId, lang.code, 'navigating', 'validation'), 2000);
                setTimeout(() => updateProductProgressBar(currentProductId, lang.code, 'validating-photos', 'validation'), 4000);
                setTimeout(() => updateProductProgressBar(currentProductId, lang.code, 'validating-description', 'validation'), 6000);

                chrome.runtime.sendMessage({
                    type: 'VALIDATE_CURRENT_PAGE',
                    tabId: lang.tab.id
                }, (response) => {
                    if (response.success) {
                        updateProductProgressBar(currentProductId, lang.code, 'completed', 'validation');
                        console.log(`✅ ${lang.name} validée avec succès`);
                        resolve({ lang: lang.code, success: true });
                    } else {
                        updateProductProgressBar(currentProductId, lang.code, 'error', 'validation');
                        console.error(`❌ Erreur ${lang.name}:`, response.error);
                        reject(new Error(`${lang.name}: ${response.error}`));
                    }
                });
            });
        });

        try {
            const results = await Promise.allSettled(validationPromises);
            const successes = results.filter(r => r.status === 'fulfilled').length;
            const failures = results.filter(r => r.status === 'rejected').length;

            console.log(`📊 Résultats validation: ${successes} réussies, ${failures} échouées`);

            if (failures > 0) {
                showStatus(statusDiv, 'warning', `⚠️ ${successes}/${filteredToValidate.length} langue(s) validées (${failures} erreur(s))`);
            } else {
                showStatus(statusDiv, 'success', `✅ ${filteredToValidate.length} langue(s) validées en parallèle !`);
            }

        } catch (error) {
            showStatus(statusDiv, 'error', 'Erreur lors des validations: ' + error.message);
        }

        btn.disabled = false;
        removeProductProgressGroup(currentProductId, 'validation', 3000);

    } catch (error) {
        showStatus(statusDiv, 'error', 'Erreur: ' + error.message);
        btn.disabled = false;
        if (currentValidationProduct) {
            removeProductProgressGroup(currentValidationProduct, 'validation', 1000);
        }
    }
});

// ========================================
// BOUTON: FERMER LES ONGLETS TRADUITS
// ========================================

document.getElementById('closeTranslatedBtn').addEventListener('click', async () => {
    try {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!currentTab.url || !currentTab.url.includes('basecat/pim/product.php')) {
            showStatus(document.getElementById('translateAllStatus'), 'error', 'Vous devez être sur une page Basecat');
            return;
        }

        const currentUrl = new URL(currentTab.url);
        const currentProductId = currentUrl.searchParams.get('id');

        if (!currentProductId) {
            showStatus(document.getElementById('translateAllStatus'), 'error', 'ID produit introuvable');
            return;
        }

        // Récupérer les langues cochées (langues cibles)
        const checkedLangs = [];
        document.querySelectorAll('.checkbox-item input[type="checkbox"]:checked').forEach(cb => {
            checkedLangs.push(cb.value);
        });

        const allTabs = await chrome.tabs.query({ currentWindow: true });
        const tabsToClose = allTabs.filter(t => {
            if (!t.url || !t.url.includes('basecat/pim/product.php')) return false;

            const url = new URL(t.url);
            const productId = url.searchParams.get('id');
            const locData = url.searchParams.get('loc_data');

            // Fermer les onglets traduits (langues cibles cochées) du même produit
            return productId === currentProductId && checkedLangs.includes(locData);
        });

        if (tabsToClose.length === 0) {
            showStatus(document.getElementById('translateAllStatus'), 'info', 'Aucun onglet à fermer');
            return;
        }

        const tabIds = tabsToClose.map(t => t.id);
        await chrome.tabs.remove(tabIds);

        showStatus(
            document.getElementById('translateAllStatus'),
            'success',
            `✅ ${tabsToClose.length} onglet(s) fermé(s)`
        );

        setTimeout(updatePagesStatus, 500);

    } catch (error) {
        showStatus(document.getElementById('translateAllStatus'), 'error', 'Erreur: ' + error.message);
    }
});

// ========================================
// LISTENERS POUR MISE À JOUR AUTOMATIQUE
// ========================================

chrome.tabs.onActivated.addListener(() => {
    updateCurrentPage();
    updatePagesStatus();
});

chrome.tabs.onUpdated.addListener(() => {
    updateCurrentPage();
    updatePagesStatus();
});

chrome.tabs.onCreated.addListener(() => {
    setTimeout(updatePagesStatus, 500);
});

// ========================================
// GESTION DES SECTIONS COLLAPSIBLES
// ========================================

document.querySelectorAll('.section-title').forEach(title => {
    title.addEventListener('click', () => {
        const section = title.closest('.section');
        section.classList.toggle('collapsed');
    });
});

async function displayStats() {
    const { translationStats } = await chrome.storage.local.get('translationStats');
    const statsContent = document.getElementById('statsContent');

    if (!translationStats || translationStats.totalTranslations === 0) {
        statsContent.innerHTML = `
            <div class="stats-empty">
                <p>📊 Aucune traduction effectuée pour le moment</p>
                <p class="stats-hint">Les statistiques apparaîtront après votre première traduction</p>
            </div>
        `;
        return;
    }

    const stats = translationStats;
    const avgCostPerTranslation = stats.totalCost / stats.totalTranslations;
    const langStats = Object.entries(stats.byLanguage)
        .filter(([_, data]) => data.count > 0)
        .map(([code, data]) => {
            return {
                name: getFormattedLanguageName(code),
                count: data.count,
                cost: data.cost,
                percentage: ((data.count / stats.totalTranslations) * 100).toFixed(1)
            };
        });

    statsContent.innerHTML = `
        <div class="stats-grid">
            <!-- Carte 1: Total -->
            <div class="stat-card stat-card-primary">
                <div class="stat-icon">🌐</div>
                <div class="stat-value">${stats.totalTranslations}</div>
                <div class="stat-label">Traductions totales</div>
            </div>
  
            <!-- Carte 2: Coût total -->
            <div class="stat-card stat-card-cost">
                <div class="stat-icon">💰</div>
                <div class="stat-value">$${stats.totalCost.toFixed(4)}</div>
                <div class="stat-label">Coût total estimé</div>
            </div>
  
            <!-- Carte 3: Coût moyen -->
            <div class="stat-card stat-card-info">
                <div class="stat-icon">📊</div>
                <div class="stat-value">$${avgCostPerTranslation.toFixed(4)}</div>
                <div class="stat-label">Coût moyen/traduction</div>
            </div>
  
            <!-- Carte 4: Tokens -->
            <div class="stat-card stat-card-tokens">
                <div class="stat-icon">🔤</div>
                <div class="stat-value">${(stats.totalInputTokens + stats.totalOutputTokens).toLocaleString()}</div>
                <div class="stat-label">Tokens utilisés</div>
            </div>
        </div>
  
        <!-- Détails par langue -->
        <div class="stats-by-language">
            <h4 class="stats-subtitle">📈 Répartition par langue</h4>
            ${langStats.map(lang => `
                <div class="lang-stat-row">
                    <span class="lang-stat-name">${lang.name}</span>
                    <span class="lang-stat-count">${lang.count} traductions (${lang.percentage}%)</span>
                    <span class="lang-stat-cost">$${lang.cost.toFixed(4)}</span>
                </div>
            `).join('')}
        </div>
  
        <!-- Dernière mise à jour -->
        <div class="stats-footer">
            <small>Dernière mise à jour: ${new Date(stats.lastUpdated).toLocaleString('fr-FR')}</small>
        </div>
  
        <button id="resetStatsBtn" class="btn-reset-stats">🗑️ Réinitialiser les statistiques</button>
    `;

    document.getElementById('resetStatsBtn').addEventListener('click', async () => {
        if (confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser toutes les statistiques ?')) {
            await chrome.storage.local.remove('translationStats');
            displayStats();
            showStatus(
                document.getElementById('translateAllStatus'),
                'success',
                '✅ Statistiques réinitialisées'
            );
        }
    });
}
