import { callOpenAI } from './api.js';
import { LANGUAGES, createEmptyLangTabs, getLanguageName } from './languages-config.js';

// ========================================
// SYSTÈME DE STATISTIQUES
// ========================================

// Prix OpenAI pour gpt-4o-mini (au 2024)
const PRICING = {
  input: 0.150 / 1_000_000,
  output: 0.600 / 1_000_000
};

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function calculateTranslationCost(sourceText, translatedText) {
  const inputTokens = estimateTokens(sourceText);
  const outputTokens = estimateTokens(translatedText);

  const inputCost = inputTokens * PRICING.input;
  const outputCost = outputTokens * PRICING.output;

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    cost: inputCost + outputCost
  };
}

async function recordTranslation(productId, langCode, sourceTexts, translatedTexts) {
  const { translationStats } = await chrome.storage.local.get('translationStats');

  // Initialiser les stats par langue dynamiquement
  const byLanguage = {};
  LANGUAGES.forEach(lang => {
    byLanguage[lang.code] = { count: 0, cost: 0 };
  });

  const stats = translationStats || {
    totalTranslations: 0,
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    byLanguage: byLanguage,
    byProduct: {},
    lastUpdated: null,
    history: []
  };

  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const titleCost = calculateTranslationCost(
    sourceTexts.title || '',
    translatedTexts.title || ''
  );
  totalCost += titleCost.cost;
  totalInputTokens += titleCost.inputTokens;
  totalOutputTokens += titleCost.outputTokens;

  const descCost = calculateTranslationCost(
    sourceTexts.description || '',
    translatedTexts.description || ''
  );
  totalCost += descCost.cost;
  totalInputTokens += descCost.inputTokens;
  totalOutputTokens += descCost.outputTokens;

  if (sourceTexts.material && translatedTexts.material) {
    const matCost = calculateTranslationCost(
      sourceTexts.material,
      translatedTexts.material
    );
    totalCost += matCost.cost;
    totalInputTokens += matCost.inputTokens;
    totalOutputTokens += matCost.outputTokens;
  }

  stats.totalTranslations += 1;
  stats.totalCost += totalCost;
  stats.totalInputTokens += totalInputTokens;
  stats.totalOutputTokens += totalOutputTokens;

  if (!stats.byLanguage[langCode]) {
    stats.byLanguage[langCode] = { count: 0, cost: 0 };
  }
  stats.byLanguage[langCode].count += 1;
  stats.byLanguage[langCode].cost += totalCost;

  if (!stats.byProduct[productId]) {
    stats.byProduct[productId] = {
      count: 0,
      cost: 0,
      languages: []
    };
  }
  stats.byProduct[productId].count += 1;
  stats.byProduct[productId].cost += totalCost;
  if (!stats.byProduct[productId].languages.includes(langCode)) {
    stats.byProduct[productId].languages.push(langCode);
  }

  stats.history.push({
    date: new Date().toISOString(),
    productId,
    language: langCode,
    cost: totalCost,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens
  });

  if (stats.history.length > 100) {
    stats.history = stats.history.slice(-100);
  }

  stats.lastUpdated = new Date().toISOString();
  await chrome.storage.local.set({ translationStats: stats });

  console.log('📊 Stats enregistrées:', {
    translation: `${productId} → ${langCode}`,
    cost: `$${totalCost.toFixed(6)}`,
    tokens: `${totalInputTokens + totalOutputTokens} total`
  });

  return stats;
}

// ========================================
// SYSTÈME DE GESTION DES FAVICONS COLORÉES
// ========================================

const productColors = new Map();

function generateColor(productId) {
  if (productColors.has(productId)) {
    return productColors.get(productId);
  }

  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    const char = productId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const hue = (Math.abs(hash) * 137.508) % 360;
  const color = `hsl(${hue}, 70%, 60%)`;

  productColors.set(productId, color);
  return color;
}

function generateFaviconDataUrl(color, langCode) {
  const canvas = new OffscreenCanvas(32, 32);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 32, 32);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 32, 32);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(langCode.toUpperCase(), 16, 16);

  return canvas.convertToBlob({ type: 'image/png' })
    .then(blob => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    });
}

async function updateTabFavicon(tabId, productId, langCode) {
  try {
    const color = generateColor(productId);
    const langShort = langCode.split('_')[0];
    const faviconDataUrl = await generateFaviconDataUrl(color, langShort);

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (dataUrl) => {
        const existingLinks = document.querySelectorAll("link[rel*='icon']");
        existingLinks.forEach(link => link.remove());

        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.href = dataUrl;
        document.head.appendChild(link);
      },
      args: [faviconDataUrl]
    });

    console.log(`🎨 Favicon mise à jour pour tab ${tabId} (${langCode}) - Couleur: ${color}`);
  } catch (error) {
    console.error('Erreur mise à jour favicon:', error);
  }
}

async function colorizeBasecatTabs() {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (tab.url && tab.url.includes('basecat/pim/product.php')) {
      try {
        const url = new URL(tab.url);
        const productId = url.searchParams.get('id');
        const locData = url.searchParams.get('loc_data');

        if (productId && locData) {
          await updateTabFavicon(tab.id, productId, locData);
        }
      } catch (error) {
        console.error('Erreur colorisation tab:', error);
      }
    }
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('basecat/pim/product.php')) {
    try {
      const url = new URL(tab.url);
      const productId = url.searchParams.get('id');
      const locData = url.searchParams.get('loc_data');

      if (productId && locData) {
        updateTabFavicon(tabId, productId, locData);
      }
    } catch (error) {
      console.error('Erreur colorisation tab:', error);
    }
  }
});

chrome.tabs.onCreated.addListener(() => {
  setTimeout(colorizeBasecatTabs, 500);
});

// ========================================
// GESTION DE L'EXTENSION
// ========================================

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TRANSLATE_PAGE') {
    translateCurrentPage(request.tabId, request.apiKey, request.frTabId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.type === 'VALIDATE_CURRENT_PAGE') {
    validateCurrentPage(request.tabId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.type === 'VALIDATE_ALL_PAGES') {
    validateAllPages(request.tabId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.type === 'COLORIZE_TABS') {
    colorizeBasecatTabs()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.type === 'GET_PRODUCT_COLOR') {
    const color = generateColor(request.productId);
    sendResponse({ color: color });
    return true;
  }
});

// ========================================
// FONCTION DE TRADUCTION
// ========================================

async function translateCurrentPage(tabId, apiKey, frTabId = null) {
  console.log('🚀 Début traduction - Tab:', tabId, 'FR Tab:', frTabId);

  const tab = await chrome.tabs.get(tabId);
  const url = new URL(tab.url);
  const locData = url.searchParams.get('loc_data');
  const productId = url.searchParams.get('id');

  if (!productId) {
    throw new Error('ID produit introuvable dans l\'URL');
  }

  if (!locData) {
    throw new Error('Langue cible introuvable dans l\'URL');
  }

  // Trouver la langue source (peut être n'importe quelle langue, pas forcément FR)
  let sourceTabId = frTabId;

  if (!sourceTabId) {
    const allTabs = await chrome.tabs.query({ currentWindow: true });
    // Chercher une langue source différente de la langue cible
    const sourceTab = allTabs.find(t => {
      if (!t.url || !t.url.includes('basecat/pim/product.php')) return false;
      const tabUrl = new URL(t.url);
      const tabLocData = tabUrl.searchParams.get('loc_data');
      return tabLocData && tabLocData !== locData
        && tabUrl.searchParams.get('id') === productId;
    });

    if (!sourceTab) {
      throw new Error(`Ouvrez d'abord une page source (différente de ${locData}) pour le produit ID: ${productId}`);
    }

    sourceTabId = sourceTab.id;
  }

  console.log('📖 Extraction données source depuis tab:', sourceTabId, 'Produit:', productId);
  const [sourceResult] = await chrome.scripting.executeScript({
    target: { tabId: sourceTabId },
    func: extractProductData
  });

  const sourceData = sourceResult.result;
  const hasMaterialInSource = sourceData.material && sourceData.material.trim().length > 0;

  console.log('📄 Données source extraites:', {
    productId: productId,
    titleLength: sourceData.title.length,
    descriptionLength: sourceData.description.length,
    materialLength: sourceData.material.length,
    hasMaterial: hasMaterialInSource
  });

  // Traduire le titre
  console.log('🌐 Traduction titre...');
  const translatedTitleData = await callOpenAI(
    sourceData.title,
    locData,
    apiKey,
    'Traduis uniquement ce titre de produit pour enfants/bébés de manière concise et naturelle.'
  );
  const translatedTitle = cleanResponse(translatedTitleData.choices[0].message.content);

  // Traduire la description
  console.log('🌐 Traduction description...');
  const translatedDescriptionData = await callOpenAI(
    sourceData.description,
    locData,
    apiKey,
    'Traduis cette description de produit en conservant le format HTML et en adaptant le style à la langue cible.'
  );
  const translatedDescription = cleanResponse(translatedDescriptionData.choices[0].message.content);

  let translatedMaterial = '';
  if (hasMaterialInSource) {
    console.log('🌐 Traduction matériau...');
    const translatedMaterialData = await callOpenAI(
      sourceData.material,
      locData,
      apiKey,
      'Traduis uniquement cette composition/matière de produit textile de manière précise et technique.'
    );
    translatedMaterial = cleanResponse(translatedMaterialData.choices[0].message.content);
    console.log('✅ Matériau traduit:', translatedMaterial);
  } else {
    console.log('⏭️ Champ matériau vide, pas de traduction nécessaire');
  }

  console.log('✅ Traductions obtenues:', {
    titleLength: translatedTitle.length,
    descriptionLength: translatedDescription.length,
    materialLength: translatedMaterial.length
  });

  await recordTranslation(
    productId,
    locData,
    {
      title: sourceData.title,
      description: sourceData.description,
      material: hasMaterialInSource ? sourceData.material : null
    },
    {
      title: translatedTitle,
      description: translatedDescription,
      material: translatedMaterial
    }
  );

  // Injection du titre
  console.log('💉 Injection titre dans tab:', tabId);
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: injectTitle,
    args: [translatedTitle]
  });

  // Injection description
  console.log('💉 Injection description dans tab:', tabId);
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    world: 'MAIN',
    func: injectDescription,
    args: [translatedDescription]
  });

  if (translatedMaterial && translatedMaterial.trim().length > 0) {
    console.log('💉 Injection matériau dans tab:', tabId);
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: injectMaterial,
      args: [translatedMaterial]
    });

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const input = document.querySelector('#material');
        if (input) {
          input.setAttribute('data-should-have-material', 'true');
        }
      }
    });
  } else if (hasMaterialInSource) {
    console.warn('⚠️ Matériau source existait mais traduction vide, marquage pour vérification');
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const input = document.querySelector('#material');
        if (input) {
          input.setAttribute('data-should-have-material', 'true');
        }
      }
    });
  } else {
    console.log('⏭️ Pas d\'injection matériau (champ vide en source)');
  }

  console.log('✅ Traduction terminée pour produit:', productId);
}

// ========================================
// NAVIGATION VERS PAGE DE VALIDATION
// ========================================

async function navigateToValidationPage(tabId) {
  console.log('📍 Navigation vers page de validation (ur=V)');

  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const url = new URL(window.location.href);
      url.searchParams.set('ur', 'V');
      window.location.href = url.toString();
    }
  });

  return new Promise((resolve) => {
    const listener = (changedTabId, changeInfo) => {
      if (changedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        console.log('✅ Page de validation chargée (ur=V)');
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);

    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 5000);
  });
}

// ========================================
// VALIDATION PAGE COURANTE
// ========================================

async function validateCurrentPage(tabId) {
  console.log('🔍 Début du processus de validation - Tab:', tabId);

  const tab = await chrome.tabs.get(tabId);
  const url = new URL(tab.url);
  const locData = url.searchParams.get('loc_data');
  const currentUr = url.searchParams.get('ur');

  if (currentUr !== 'V') {
    console.log('💾 ÉTAPE 1 : Enregistrement sur ur=R...');

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: async () => {
        const SaveSystem = {
          CONFIG: {
            validationDelay: 300
          },

          simulateClick(element) {
            if (!element) throw new Error('Élément manquant');

            const wasHidden = window.getComputedStyle(element).display === 'none';
            const originalDisplay = element.style.display;

            if (wasHidden) element.style.display = 'block';

            try {
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              element.dispatchEvent(clickEvent);
              console.log('✅ Clic enregistrement simulé');
            } finally {
              if (wasHidden) element.style.display = originalDisplay;
            }
          },

          handlePopups() {
            return new Promise((resolve) => {
              const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                      if (node.classList?.contains('ui-dialog')) {
                        const titleElement = node.querySelector('.ui-dialog-title');
                        if (titleElement && (
                          titleElement.textContent.includes("Propriétés requises vides") ||
                          titleElement.textContent.includes("prise en compte")
                        )) {
                          console.warn('⚠️ Popup bloquée:', titleElement.textContent);
                          node.style.display = 'none';
                          setTimeout(() => node.remove(), 100);
                        }
                      }

                      if (node.classList?.contains('ui-widget-overlay')) {
                        node.style.display = 'none';
                        setTimeout(() => node.remove(), 100);
                      }
                    }
                  });
                });
              });

              observer.observe(document.body, {
                childList: true,
                subtree: true
              });

              let attempts = 0;
              const maxAttempts = 5;

              const checkAndClickPopups = () => {
                try {
                  let clicked = false;

                  const okButton = document.querySelector('#infos_ok');
                  if (okButton && window.getComputedStyle(okButton).display !== 'none') {
                    const parentDialog = okButton.closest('.ui-dialog');
                    const titleElement = parentDialog?.querySelector('.ui-dialog-title');

                    if (!titleElement || !titleElement.textContent.includes("Propriétés requises vides")) {
                      this.simulateClick(okButton);
                      clicked = true;
                      console.log('✅ Popup OK cliqué');
                    }
                  }

                  attempts++;
                  if (attempts < maxAttempts) {
                    setTimeout(() => checkAndClickPopups(), this.CONFIG.validationDelay);
                  } else {
                    observer.disconnect();
                    resolve();
                  }
                } catch (error) {
                  console.error('Erreur popup:', error);
                  observer.disconnect();
                  resolve();
                }
              };

              setTimeout(() => checkAndClickPopups(), this.CONFIG.validationDelay);
            });
          },

          async saveDescriptionAndPhotos() {
            const saveButton = document.querySelector("#descriptif .saved");

            if (saveButton && window.getComputedStyle(saveButton).display !== "none") {
              this.simulateClick(saveButton);
              console.log("✅ Bouton 'Enregistrer' cliqué");
            } else {
              throw new Error("Bouton 'Enregistrer' introuvable ou invisible");
            }

            await this.handlePopups();

            return { success: true };
          }
        };

        return await SaveSystem.saveDescriptionAndPhotos();
      }
    });

    await new Promise(r => setTimeout(r, 1500));
  }

  if (currentUr !== 'V') {
    console.log('📍 ÉTAPE 2 : Navigation vers ur=V...');
    await navigateToValidationPage(tabId);
    await new Promise(r => setTimeout(r, 1000));
  }

  // ÉTAPE 3 : VALIDER sur ur=V
  console.log('✅ ÉTAPE 3 : Validation sur ur=V...');

  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    world: 'MAIN',
    func: async () => {
      const ValidationSystem = {
        CONFIG: {
          retryAttempts: 3,
          retryDelay: 1000,
          validationDelay: 300
        },

        simulateClick(element) {
          if (!element) throw new Error('Élément manquant');

          const wasHidden = window.getComputedStyle(element).display === 'none';
          const originalDisplay = element.style.display;

          if (wasHidden) element.style.display = 'block';

          try {
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            element.dispatchEvent(clickEvent);
            console.log('✅ Clic validation simulé');
          } finally {
            if (wasHidden) element.style.display = originalDisplay;
          }
        },

        handlePopups() {
          return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 3;

            const checkAndClickPopups = () => {
              try {
                let clicked = false;

                const dialogs = document.querySelectorAll('.ui-dialog-title');
                for (const dialog of dialogs) {
                  if (dialog.textContent.includes("Propriétés requises vides")) {
                    console.warn('⚠️ Propriétés manquantes détectées - Validation');
                    resolve();
                    return;
                  }
                }

                const okButton = document.querySelector('#infos_ok');
                if (okButton && window.getComputedStyle(okButton).display !== 'none') {
                  this.simulateClick(okButton);
                  clicked = true;
                  console.log('✅ OK cliqué');
                }

                attempts++;
                if (clicked && attempts < maxAttempts) {
                  setTimeout(() => checkAndClickPopups(), this.CONFIG.validationDelay);
                } else {
                  resolve();
                }
              } catch (error) {
                console.error('Erreur popup:', error);
                resolve();
              }
            };

            setTimeout(() => checkAndClickPopups(), this.CONFIG.validationDelay);
          });
        },

        async sendValidationRequest(params) {
          const response = await fetch('/basecat/pim/product.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: new URLSearchParams(params)
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return await response.text();
        },

        async validateSinglePhoto(productCode, purchaseColor) {
          for (let i = 0; i < this.CONFIG.retryAttempts; i++) {
            try {
              const params = {
                'action': 'bloc_photo_validation',
                'code': productCode,
                'validate_all': 'false',
                'validation[block]': 'photo_block',
                'validation[purchase_color]': purchaseColor
              };

              await this.sendValidationRequest(params);
              console.log(`✅ Photo validée: ${purchaseColor}`);
              return;
            } catch (error) {
              if (i === this.CONFIG.retryAttempts - 1) throw error;
              await new Promise(r => setTimeout(r, this.CONFIG.retryDelay));
            }
          }
        },

        async validateAllPhotos() {
          const urlParams = new URLSearchParams(window.location.search);
          const productCode = urlParams.get('id');
          const photoSections = document.querySelectorAll('div[id="photo"].js_refco');

          console.log(`📸 ${photoSections.length} sections photos à valider`);

          let successCount = 0;
          let skipCount = 0;

          for (const section of photoSections) {
            const purchaseColor = section.getAttribute('data-purchase_color');
            const validateButton = section.querySelector('button.validated.one_locale_validation');
            const hasImageContainer = !!section.querySelector('.image-container');

            if (!hasImageContainer) {
              console.warn(`⏭️ ${purchaseColor} ignorée (pas d'image)`);
              skipCount++;
              continue;
            }

            if (validateButton) {
              console.log(`📄 Validation photo: ${purchaseColor}`);

              await this.validateSinglePhoto(productCode, purchaseColor);
              this.simulateClick(validateButton);

              await new Promise(r => setTimeout(r, this.CONFIG.validationDelay));
              successCount++;
            } else {
              skipCount++;
            }
          }

          await this.handlePopups();

          return { successCount, skipCount };
        },

        async validateDescriptionAndPhotos() {
          console.log('📸 Validation de toutes les photos...');
          await this.validateAllPhotos();

          console.log('📝 Validation de la description...');
          const validateButton = document.querySelector("#descriptif .validated");

          if (validateButton && window.getComputedStyle(validateButton).display !== "none") {
            this.simulateClick(validateButton);
            console.log("✅ 'Valider' cliqué");
          } else {
            throw new Error("Bouton 'Valider' introuvable ou invisible");
          }

          await this.handlePopups();
          return { success: true };
        }
      };

      return await ValidationSystem.validateDescriptionAndPhotos();
    }
  });

  console.log('✅✅✅ Processus complet terminé pour:', locData);
}

// ========================================
// VALIDATION DE TOUTES LES PAGES
// ========================================

async function validateAllPages(currentTabId) {
  console.log('🚀 Validation de toutes les pages traduites');

  const tab = await chrome.tabs.get(currentTabId);
  const url = new URL(tab.url);
  const productId = url.searchParams.get('id');

  if (!productId) {
    throw new Error('ID produit introuvable');
  }

  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const productTabs = allTabs.filter(t => {
    if (!t.url || !t.url.includes('basecat/pim/product.php')) return false;
    const tUrl = new URL(t.url);
    return tUrl.searchParams.get('id') === productId;
  });

  const langTabs = createEmptyLangTabs();

  productTabs.forEach(tab => {
    const tUrl = new URL(tab.url);
    const locData = tUrl.searchParams.get('loc_data');
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

  if (toValidate.length === 0) {
    throw new Error('Aucune page à valider');
  }

  console.log(`📋 ${toValidate.length} page(s) à valider`);

  for (const lang of toValidate) {
    console.log(`\n========================================`);
    console.log(`📄 TRAITEMENT: ${lang.name} (Tab ID: ${lang.tab.id})`);
    console.log(`========================================`);

    await validateCurrentPage(lang.tab.id);

    console.log(`⏸️  Pause avant la prochaine langue...`);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n✅✅✅ TOUTES LES PAGES VALIDÉES !');
}

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

function cleanResponse(text) {
  return text
    .replace(/^```markdown\n?/i, '')
    .replace(/\n?```$/i, '')
    .replace(/^['"`]|['"`]$/g, '')
    .trim();
}

function extractProductData() {
  const titleInput = document.querySelector('#item-titre-court');
  const iframe = document.querySelector('#cke_contents_descriptif-long iframe');
  const materialInput = document.querySelector('#material');

  let description = '';
  if (iframe && iframe.contentDocument) {
    description = iframe.contentDocument.body.innerHTML;
  }

  let material = '';
  if (materialInput) {
    material = materialInput.value || '';
  }

  return {
    title: titleInput ? titleInput.value : '',
    description: description,
    material: material
  };
}

function injectTitle(title) {
  console.log('🔵 Injection titre:', title);
  const titleInput = document.querySelector('#item-titre-court');
  if (titleInput) {
    titleInput.value = title;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    titleInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Titre injecté');
  } else {
    console.error('❌ Input titre introuvable');
  }
}

function injectDescription(description) {
  console.log('📝 Injection description CKEditor');

  const editorId = 'descriptif-long';

  function attemptInject() {
    if (typeof CKEDITOR === 'undefined') {
      console.error('❌ CKEDITOR non disponible');
      return false;
    }

    const editor = CKEDITOR.instances[editorId];
    if (!editor) {
      console.error('❌ Instance CKEditor introuvable:', editorId);
      return false;
    }

    try {
      editor.setData(description);
      console.log('✅ setData() réussi');

      setTimeout(() => {
        editor.fire('change');
        editor.updateElement();

        const iframe = document.querySelector('#cke_contents_descriptif-long iframe');
        if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
          iframe.contentDocument.body.innerHTML = description;
          console.log('✅ Backup iframe OK');
        }

        console.log('✅ Description complètement injectée');
      }, 300);

      return true;
    } catch (error) {
      console.error('❌ Erreur injection:', error);
      return false;
    }
  }

  if (!attemptInject()) {
    console.log('⏳ Réessai dans 500ms...');
    setTimeout(() => {
      if (!attemptInject()) {
        console.log('⏳ Dernière tentative dans 1s...');
        setTimeout(attemptInject, 1000);
      }
    }, 500);
  }
}

function injectMaterial(material) {
  console.log('🧵 Injection matériau:', material);
  const materialInput = document.querySelector('#material');
  if (materialInput) {
    materialInput.value = material;
    materialInput.dispatchEvent(new Event('input', { bubbles: true }));
    materialInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('✅ Matériau injecté');
  } else {
    console.error('❌ Input matériau introuvable');
  }
}