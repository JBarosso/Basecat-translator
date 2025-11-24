// ========================================
// CONFIGURATION CENTRALISÉE DES LANGUES
// ========================================
// Pour ajouter une nouvelle langue, ajoutez simplement un objet dans le tableau LANGUAGES

export const LANGUAGES = [
  {
    code: 'es_ES',
    shortCode: 'es',
    name: 'Espagnol',
    flag: '🇪🇸',
    glossaryFile: 'glossary_es.json',
    defaultChecked: true,
    // Configuration pour l'API OpenAI (si nécessaire)
    assistantId: 'asst_AtmAZD7J3o1IB34WrDgtY4Iv',
    assistantName: 'GPT-TRAD-ES',
    vectorStoreId: 'vs_77LPNz4BxMGqN4XTQeO3vsKY'
  },
  {
    code: 'el_GR',
    shortCode: 'el',
    name: 'Grec',
    flag: '🇬🇷',
    glossaryFile: 'glossary_gr.json',
    defaultChecked: true,
    assistantId: 'asst_RnHjd9VgUCNFzzsn2527ZMRR',
    assistantName: 'GPT-TRAD-GR',
    vectorStoreId: 'vs_LzvD0OhVgHY9FwmB1JV8vQ3m'
  },
  {
    code: 'nl_BE',
    shortCode: 'nl',
    name: 'Néerlandais',
    flag: '🇳🇱',
    glossaryFile: 'glossary_fl.json',
    defaultChecked: true,
    assistantId: 'asst_988V78wxAzaGgxaBo4pXt8kp',
    assistantName: 'GPT-TRAD-BENL',
    vectorStoreId: 'vs_58DKVYqNGmaqwKtP50dT3N85'
  },
  {
    code: 'fr_FR',
    shortCode: 'fr',
    name: 'Français',
    flag: '🇫🇷',
    glossaryFile: 'glossary_fr.json',
    defaultChecked: false,
    assistantId: null,
    assistantName: null,
    vectorStoreId: null
  }
];

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Récupère une langue par son code complet (ex: 'es_ES')
 */
export function getLanguageByCode(code) {
  return LANGUAGES.find(lang => lang.code === code);
}

/**
 * Récupère une langue par son code court (ex: 'es')
 */
export function getLanguageByShortCode(shortCode) {
  return LANGUAGES.find(lang => lang.shortCode === shortCode);
}

/**
 * Récupère toutes les langues cochées par défaut
 */
export function getDefaultCheckedLanguages() {
  return LANGUAGES.filter(lang => lang.defaultChecked);
}

/**
 * Récupère tous les codes de langue
 */
export function getAllLanguageCodes() {
  return LANGUAGES.map(lang => lang.code);
}

/**
 * Récupère tous les fichiers glossary
 */
export function getAllGlossaryFiles() {
  return LANGUAGES.map(lang => lang.glossaryFile);
}

/**
 * Crée un objet langTabs vide avec toutes les langues
 */
export function createEmptyLangTabs() {
  const langTabs = {};
  LANGUAGES.forEach(lang => {
    langTabs[lang.code] = null;
  });
  return langTabs;
}

/**
 * Récupère le nom formaté d'une langue (avec drapeau)
 */
export function getFormattedLanguageName(code) {
  const lang = getLanguageByCode(code);
  return lang ? `${lang.flag} ${lang.name}` : code;
}

/**
 * Récupère le nom simple d'une langue (sans drapeau)
 */
export function getLanguageName(code) {
  const lang = getLanguageByCode(code);
  return lang ? lang.name : code;
}

/**
 * Récupère les informations de langue pour l'affichage (flag + name)
 */
export function getLanguageDisplayInfo(shortCode) {
  const lang = getLanguageByShortCode(shortCode);
  return lang ? { flag: lang.flag, name: lang.name } : null;
}

