export const LANGUAGES = [
    {
        code: 'es_ES',
        shortCode: 'es',
        name: 'Espagnol',
        flag: '🇪🇸',
        glossaryFile: 'glossary_es.json',
        defaultChecked: true,
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

export function getLanguageByCode(code) {
    return LANGUAGES.find(l => l.code === code);
}

export function getLanguageByShortCode(shortCode) {
    return LANGUAGES.find(l => l.shortCode === shortCode);
}

export function getLanguageName(code) {
    const lang = getLanguageByCode(code);
    return lang ? lang.name : code;
}

export function getFormattedLanguageName(code) {
    const lang = getLanguageByCode(code);
    if (!lang) return code;
    return `${lang.flag} ${lang.name}`;
}

export function createEmptyLangTabs() {
    const tabs = {};
    LANGUAGES.forEach(lang => {
        tabs[lang.code] = undefined;
    });
    return tabs;
}
