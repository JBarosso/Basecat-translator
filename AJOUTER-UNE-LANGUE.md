# Guide : Ajouter une nouvelle langue à Basecat Translator

Ce guide vous explique comment ajouter une nouvelle langue à l'extension Basecat Translator. Grâce au système de configuration centralisé, l'ajout d'une nouvelle langue est maintenant très simple et ne nécessite que quelques étapes.

## 📋 Vue d'ensemble

L'extension utilise un fichier de configuration centralisé (`languages-config.js`) qui contient toutes les informations sur les langues supportées. Pour ajouter une nouvelle langue, vous devez :

1. ✅ Ajouter la configuration dans `languages-config.js`
2. ✅ Créer le fichier glossary correspondant
3. ✅ Mettre à jour `manifest.json`
4. ✅ Recharger l'extension

**Tous les autres fichiers s'adapteront automatiquement !** 🎉

---

## 🔧 Étapes détaillées

### Étape 1 : Ajouter la configuration dans `languages-config.js`

Ouvrez le fichier `languages-config.js` et ajoutez un nouvel objet dans le tableau `LANGUAGES`.

#### Exemple : Ajouter l'italien (IT)

```javascript
{
  code: 'it_IT',                    // Code complet de la langue (format: xx_XX)
  shortCode: 'it',                  // Code court (2 lettres ISO 639-1)
  name: 'Italien',                  // Nom de la langue en français
  flag: '🇮🇹',                        // Emoji drapeau du pays
  glossaryFile: 'glossary_it.json', // Nom du fichier glossary
  defaultChecked: true,             // Coche par défaut dans l'interface (true/false)
  // Configuration OpenAI (optionnel - uniquement si vous avez un assistant OpenAI)
  assistantId: 'asst_XXXXXXXXXXXX', // ID de l'assistant OpenAI (ou null)
  assistantName: 'GPT-TRAD-IT',     // Nom de l'assistant (ou null)
  vectorStoreId: 'vs_XXXXXXXXXXXX'  // ID du vector store (ou null)
}
```

#### Exemple complet dans le fichier :

```javascript
export const LANGUAGES = [
  // ... langues existantes ...
  {
    code: 'it_IT',
    shortCode: 'it',
    name: 'Italien',
    flag: '🇮🇹',
    glossaryFile: 'glossary_it.json',
    defaultChecked: true,
    assistantId: null,  // À remplir si vous avez un assistant OpenAI
    assistantName: null,
    vectorStoreId: null
  }
];
```

#### 📝 Notes importantes :

- **`code`** : Format standard `xx_XX` (ex: `it_IT`, `pt_PT`, `de_DE`)
- **`shortCode`** : Code ISO 639-1 à 2 lettres (ex: `it`, `pt`, `de`)
- **`glossaryFile`** : Le nom du fichier JSON doit correspondre au pattern `glossary_XX.json` où `XX` est le `shortCode`
- **`defaultChecked`** : Détermine si la langue est cochée par défaut dans l'interface
- **Configuration OpenAI** : Si vous n'avez pas d'assistant OpenAI pour cette langue, mettez `null` pour ces trois champs

---

### Étape 2 : Créer le fichier glossary

Créez un nouveau fichier JSON dans le dossier racine de l'extension avec le nom spécifié dans `glossaryFile`.

#### Exemple : `glossary_it.json`

```json
[
  {
    "word_source": "coton",
    "word_replace": "cotone"
  },
  {
    "word_source": "polyester",
    "word_replace": "poliestere"
  },
  {
    "word_source": "lavable en machine",
    "word_replace": "lavabile in lavatrice"
  }
]
```

#### 📝 Format du glossary :

- **Tableau JSON** : Le fichier doit être un tableau d'objets
- **`word_source`** : Le mot/expression en français (ou langue source)
- **`word_replace`** : La traduction dans la langue cible
- **Ordre** : Les entrées peuvent être dans n'importe quel ordre

#### 💡 Conseils :

- Commencez avec un glossaire vide `[]` si vous n'avez pas encore de termes spécifiques
- Ajoutez progressivement les termes importants pour votre marque/produit
- Gardez la cohérence (casse, genre, pluriels) selon la langue cible

---

### Étape 3 : Mettre à jour `manifest.json`

Ouvrez `manifest.json` et ajoutez le nouveau fichier glossary dans la section `web_accessible_resources`.

#### Avant :

```json
"web_accessible_resources": [{
  "resources": ["glossary_es.json", "glossary_gr.json", "glossary_fl.json", "glossary_fr.json"],
  "matches": ["<all_urls>"]
}]
```

#### Après (avec l'italien) :

```json
"web_accessible_resources": [{
  "resources": ["glossary_es.json", "glossary_gr.json", "glossary_fl.json", "glossary_fr.json", "glossary_it.json"],
  "matches": ["<all_urls>"]
}]
```

#### 📝 Important :

- Ajoutez le fichier dans le tableau `resources`
- Respectez la virgule entre les éléments
- Le nom du fichier doit correspondre exactement à `glossaryFile` dans `languages-config.js`

---

### Étape 4 : Recharger l'extension

1. Ouvrez `chrome://extensions`
2. Trouvez "Basecat Translator"
3. Cliquez sur l'icône de rechargement (↻)
4. Ouvrez le panneau latéral de l'extension

**La nouvelle langue devrait maintenant apparaître dans l'interface !** ✅

---

## ✅ Vérification

Après avoir ajouté la nouvelle langue, vérifiez que :

- [ ] La langue apparaît dans la section "Sélectionner les langues cibles" du panneau latéral
- [ ] Le drapeau et le nom de la langue sont corrects
- [ ] La case est cochée par défaut si `defaultChecked: true`
- [ ] Le bouton "Ouvrir les langues sélectionnées" ouvre bien un onglet avec `loc_data=XX_XX`
- [ ] La traduction fonctionne correctement
- [ ] Le glossaire est bien chargé (vérifiez dans la console si nécessaire)

---

## 🔍 Dépannage

### La langue n'apparaît pas dans l'interface

- ✅ Vérifiez que vous avez bien rechargé l'extension
- ✅ Vérifiez la syntaxe JSON dans `languages-config.js` (pas de virgule en trop)
- ✅ Ouvrez la console du panneau latéral (F12) pour voir les erreurs éventuelles

### Le glossaire ne se charge pas

- ✅ Vérifiez que le fichier `glossary_XX.json` existe bien dans le dossier racine
- ✅ Vérifiez que le fichier est bien ajouté dans `manifest.json` → `web_accessible_resources`
- ✅ Vérifiez que le nom du fichier correspond à `glossaryFile` dans la configuration
- ✅ Vérifiez la syntaxe JSON du glossary (utilisez un validateur JSON en ligne)

### La traduction ne fonctionne pas

- ✅ Vérifiez que le code de langue dans l'URL (`loc_data=XX_XX`) correspond au `code` dans la configuration
- ✅ Vérifiez que vous avez bien une clé API OpenAI configurée
- ✅ Vérifiez la console du service worker pour les erreurs éventuelles

### Erreur "Langue non supportée"

- ✅ Vérifiez que le `shortCode` correspond bien au code dans l'URL (ex: `it_IT` → `it`)
- ✅ Vérifiez que la langue est bien présente dans le tableau `LANGUAGES`

---

## 📚 Exemples complets

### Exemple 1 : Ajouter le portugais (PT)

**1. Configuration dans `languages-config.js` :**

```javascript
{
  code: 'pt_PT',
  shortCode: 'pt',
  name: 'Portugais',
  flag: '🇵🇹',
  glossaryFile: 'glossary_pt.json',
  defaultChecked: true,
  assistantId: null,
  assistantName: null,
  vectorStoreId: null
}
```

**2. Créer `glossary_pt.json` :**

```json
[
  {
    "word_source": "coton",
    "word_replace": "algodão"
  },
  {
    "word_source": "lavable en machine",
    "word_replace": "lavável na máquina"
  }
]
```

**3. Mettre à jour `manifest.json` :**

Ajouter `"glossary_pt.json"` dans `web_accessible_resources`.

---

### Exemple 2 : Ajouter l'allemand (DE)

**1. Configuration dans `languages-config.js` :**

```javascript
{
  code: 'de_DE',
  shortCode: 'de',
  name: 'Allemand',
  flag: '🇩🇪',
  glossaryFile: 'glossary_de.json',
  defaultChecked: false,  // Non cochée par défaut
  assistantId: null,
  assistantName: null,
  vectorStoreId: null
}
```

**2. Créer `glossary_de.json` :**

```json
[]
```

**3. Mettre à jour `manifest.json` :**

Ajouter `"glossary_de.json"` dans `web_accessible_resources`.

---

## 🎯 Avantages du système centralisé

Grâce à cette architecture, l'ajout d'une nouvelle langue est **très simple** :

- ✅ **Un seul fichier à modifier** : `languages-config.js`
- ✅ **Pas besoin de toucher au code** : tous les fichiers s'adaptent automatiquement
- ✅ **Interface générée automatiquement** : les checkboxes apparaissent automatiquement
- ✅ **Statistiques automatiques** : les stats incluent automatiquement la nouvelle langue
- ✅ **Validation automatique** : la validation fonctionne pour toutes les langues

---

## 📖 Ressources utiles

- **Codes ISO 639-1** : [Liste des codes de langue](https://fr.wikipedia.org/wiki/Liste_des_codes_ISO_639-1)
- **Emojis drapeaux** : Utilisez un clavier emoji ou copiez depuis [Emojipedia](https://emojipedia.org/flags/)
- **Format JSON** : Utilisez un validateur JSON en ligne pour vérifier vos fichiers

---

## ❓ Questions fréquentes

**Q : Puis-je ajouter plusieurs langues en même temps ?**  
R : Oui ! Ajoutez simplement plusieurs objets dans le tableau `LANGUAGES`.

**Q : Dois-je créer un assistant OpenAI pour chaque langue ?**  
R : Non, c'est optionnel. Si vous n'en avez pas, mettez `null` pour les champs `assistantId`, `assistantName` et `vectorStoreId`.

**Q : Le glossaire peut-il être vide ?**  
R : Oui, vous pouvez commencer avec un tableau vide `[]` et ajouter des termes progressivement.

**Q : Puis-je modifier une langue existante ?**  
R : Oui, modifiez simplement l'objet correspondant dans `languages-config.js` et rechargez l'extension.

**Q : Comment désactiver temporairement une langue ?**  
R : Vous pouvez commenter l'objet dans `languages-config.js` ou le retirer du tableau.

---

## 🎉 C'est tout !

Vous savez maintenant comment ajouter une nouvelle langue à l'extension. Le système est conçu pour être **scalable** et **facile à maintenir**. N'hésitez pas à ajouter autant de langues que nécessaire !

Pour toute question ou problème, consultez la section [Dépannage](#-dépannage) ou vérifiez les logs dans la console du panneau latéral.

