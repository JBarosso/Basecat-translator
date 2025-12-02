## Basecat Translator – Extension Chrome

### Aperçu
Basecat Translator est une extension Chrome complète qui automatise la traduction et la validation des fiches produits Basecat depuis la page source FR vers les langues cibles (ES, EL, NL). L'extension s'appuie sur l'API OpenAI et des glossaires embarqués pour harmoniser le vocabulaire, puis injecte automatiquement les traductions dans les champs appropriés (titre, description, matériau).

### Fonctionnalités principales

#### 🌐 Traduction
- **Panneau latéral moderne**: interface intuitive avec sections collapsibles, stockage sécurisé (Chrome `storage.sync`) de la clé API OpenAI, affichage de l'état de la page courante
- **Ouverture intelligente des langues**: ouvre les onglets de traduction sélectionnés (ES, EL, NL) à partir de l'URL active avec sélection personnalisable
- **Traduction complète**: traduit et injecte automatiquement :
  - Titre court (`#item-titre-court`)
  - Description longue (CKEditor)
  - **Matériau/Composition** (`#material`) - NOUVEAU
- **Traduction en lot**: traduit toutes les langues ouvertes en séquence avec barres de progression en temps réel
- **Glossaires par langue**: remplacement prioritaire de termes via `glossary_es.json`, `glossary_gr.json`, `glossary_fl.json`
- **Injection fiable CKEditor**: utilisation de `CKEDITOR.setData(...)` avec mécanisme de secours par écriture directe dans l'iframe

#### ✅ Validation automatique
- **Navigation automatique vers ur=V**: bouton dédié pour passer à l'étape de validation
- **Validation page courante**: valide description + toutes les photos en un clic
- **Validation en lot**: valide toutes les pages traduites (ES, EL, NL) séquentiellement
- **Gestion des photos**: validation automatique de toutes les sections photos avec gestion intelligente des couleurs d'achat
- **Gestion des popups**: fermeture automatique des dialogues de confirmation et détection des erreurs

#### 🎨 Interface et visualisation
- **Favicons colorées dynamiques**: chaque produit reçoit une couleur unique, les onglets affichent des favicons personnalisées avec le code langue (ES, GR, NL)
- **Barres de progression par produit**: suivi en temps réel groupé par produit avec étapes détaillées (extraction, traduction titre/description/matériau, injection)
- **Détection des champs vides**: vérification automatique post-traduction avec affichage visuel des champs manquants
- **Sections collapsibles**: organisation ergonomique de l'interface avec sections repliables

#### 🛠️ Outils utilitaires
- **Fermeture des onglets traduits**: nettoie tous les onglets de langues cibles d'un produit en un clic
- **Redirection de recherche FR**: maintient le contexte FR lors du retour à la recherche (`search-redirect.js`)
- **Colorisation manuelle**: bouton pour appliquer/rafraîchir les favicons colorées sur tous les onglets Basecat ouverts

### Prérequis
- Accès aux pages Basecat produit: `https://back.orchestra.cc/basecat/pim/product.php?...`
- Une clé API OpenAI valide (format `sk-...`).
- Ouvrir l’onglet source en français (`loc_data=fr_FR`) et les onglets cibles souhaités.

### Installation (mode développeur)
1. Ouvrir `chrome://extensions`.
2. Activer le **Mode développeur**.
3. Cliquer **Charger l’extension non empaquetée** et sélectionner le dossier `basecat-translator`.
4. L’icône « Basecat Translator » apparaît; cliquer dessus ouvre le panneau latéral.

### Utilisation

#### Workflow complet (traduction + validation)
1. **Configuration initiale** : dans le panneau latéral (section Configuration API), saisir la **clé API OpenAI** puis cliquer « Enregistrer la clé »
2. **Sélection des langues** : cocher les langues cibles souhaitées (ES 🇪🇸, GR 🇬🇷, NL 🇳🇱)
3. **Ouverture des onglets** : depuis une page produit Basecat en FR, cliquer « Ouvrir les langues sélectionnées »
4. **Traduction** : utiliser au choix :
   - « Traduire tous » : traduit toutes les langues ouvertes en séquence avec progression visuelle
   - « Traduire » : traduit uniquement l'onglet courant
5. **Vérification** : après traduction, la section "Champs vides" affiche les éventuels champs manquants à compléter manuellement
6. **Validation** : utiliser au choix :
   - « Valider toutes les pages traduites » : valide automatiquement ES, EL, NL (enregistrement + navigation ur=V + validation photos + description)
   - « Valider » : valide uniquement la page courante
   - « Étape de validation » : navigue simplement vers ur=V sans valider
7. **Nettoyage** : cliquer « Fermer les onglets traduits » pour fermer tous les onglets de langues cibles

#### Actions individuelles
- Les champs **titre court**, **descriptif long** et **matériau** sont injectés automatiquement
- Les **favicons colorées** s'appliquent automatiquement à l'ouverture/rechargement des pages
- Le bouton « 🎨 Coloriser les onglets » permet de rafraîchir manuellement les favicons

### Structure du projet
- `manifest.json`: Manifest V3, permissions (`tabs`, `storage`, `scripting`, `sidePanel`), `host_permissions` (orchestra, openai), déclarations service worker/panneau
- `languages-config.js`: **Configuration centralisée des langues** - Fichier unique pour gérer toutes les langues supportées (voir [Documentation - Ajouter une nouvelle langue](#ajouter-une-nouvelle-langue))
- `background.js`: service worker principal. Orchestre la traduction, la validation, génère les favicons colorées, extrait les données FR (titre/description/matériau), appelle l'API et injecte les résultats
- `sidepanel.html` / `sidepanel.js`: 
  - Interface utilisateur moderne avec sections collapsibles
  - Gestion de la clé API, sélection des langues (générée dynamiquement depuis `languages-config.js`)
  - Boutons d'action (ouverture, traduction, validation, nettoyage)
  - Système de progression par produit avec barres colorées par langue
  - Détection et affichage des champs vides post-traduction
- `api.js`: chargement du glossaire par langue et appel à l'API OpenAI (chat completions `gpt-4o-mini`) avec prompts spécifiques (titre, description, matériau)
- `validation.js`: module de validation (non utilisé directement, logique intégrée dans `background.js`)
- `search-redirect.js`: content script qui intercepte le bouton "Retour aux résultats de recherche" pour maintenir le contexte de langue FR
- `content.js`: script de contenu (placeholder pour trace de chargement)
- `glossary_*.json`: glossaires spécifiques aux langues (ES/EL/NL), exposés via `web_accessible_resources`
- `icons/`: icônes de l'extension (16x16, 48x48, 128x128)

### Détails techniques

#### Architecture générale
- **Manifest V3**: service worker (`background.js`) et `side_panel` par défaut (`sidepanel.html`)
- **Détection FR/cible**: 
  - La page FR est localisée via l'URL avec `loc_data=fr_FR`
  - Les onglets Basecat sont filtrés par `basecat/pim/product.php` et groupés par `loc_data` et `id` (produit)
  - Détection automatique de la page courante et des pages ouvertes pour le même produit

#### Traduction
- **Extraction source** (onglet FR):
  - Titre court : `#item-titre-court`
  - Description longue : iframe CKEditor `#cke_contents_descriptif-long`
  - **Matériau/Composition** : `#material` (NOUVEAU)
- **Appel OpenAI**:
  - Modèle `gpt-4o-mini` (Chat Completions)
  - Trois appels séparés avec prompts spécifiques (titre, description, matériau)
  - Glossaire intégré dans les prompts système
  - Instructions e-commerce adaptées au contexte (vêtements enfants/puériculture)
  - Nettoyage automatique des réponses (guillemets, balises markdown)
- **Injection cible**:
  - Titre : injection directe dans l'input avec événements `input` et `change`
  - Description : `CKEDITOR.setData(...)` + évènements `change/updateElement`, avec backup dans l'iframe si nécessaire
  - Matériau : injection conditionnelle (uniquement si présent en FR) avec marqueur `data-should-have-material`

#### Validation
- **Navigation automatique** : passage de `ur=R` (rédaction) à `ur=V` (validation) via modification d'URL
- **Système de sauvegarde** :
  - Clic simulé sur le bouton "Enregistrer" (`#descriptif .saved`)
  - Gestion automatique des popups de confirmation/erreur avec `MutationObserver`
  - Blocage des popups d'erreur (propriétés requises vides) pour éviter l'interruption
- **Validation photos** :
  - Détection de toutes les sections `div[id="photo"].js_refco`
  - Requêtes POST AJAX pour chaque couleur d'achat (`bloc_photo_validation`)
  - Clic simulé sur les boutons `button.validated.one_locale_validation`
  - Gestion intelligente : ignore les sections sans image
- **Validation description** : clic sur `#descriptif .validated`
- **Retry automatique** : 3 tentatives avec délai de 1s entre chaque

#### Interface utilisateur
- **Favicons colorées** :
  - Génération dynamique via `OffscreenCanvas` (32x32 PNG)
  - Couleur unique par produit (hash de l'ID + nombre d'or pour distribution)
  - Affichage du code langue (ES, GR, NL) en blanc sur fond coloré
  - Application automatique lors de `onUpdated` et `onCreated` des onglets
- **Barres de progression** :
  - Groupées par produit avec couleur distinctive
  - Étapes détaillées pour traduction : extraction → titre → description → matériau → injection
  - Étapes détaillées pour validation : enregistrement → navigation ur=V → photos → description
  - Couleurs par langue (ES orange, GR bleu, NL violet, complété vert)
  - Suppression automatique après 3 secondes (traduction) ou 2 secondes (validation)
- **Détection champs vides** :
  - Vérification avec 3 tentatives max (1s entre chaque)
  - Détection titre vide, description vide (<3 caractères), matériau manquant si requis
  - Affichage visuel dans section dédiée avec icône ⚠️

### Glossaire (format et extension)
Chaque glossaire est un tableau d’objets avec les clés suivantes:
```json
[
  { "word_source": "mot français", "word_replace": "traduction ciblée" }
]
```
Le fichier est sélectionné à partir du code langue court: `es` → `glossary_es.json`, `el` → `glossary_gr.json`, `nl` → `glossary_fl.json`.

Conseils:
- Ajouter/ajuster les entrées pour harmoniser les termes marque/produit.
- Garder des valeurs cohérentes (casse, genre, pluriels) selon la langue.

### Confidentialité et permissions

#### Stockage des données
- La **clé API OpenAI** est stockée de manière sécurisée via `chrome.storage.sync` (synchronisée avec le compte Chrome)
- Aucune donnée produit n'est stockée localement de façon permanente
- Les traductions transitent uniquement en mémoire pendant l'exécution

#### Données envoyées à OpenAI
Les contenus suivants sont envoyés à l'API OpenAI pour traduction :
- Titre court du produit
- Description longue (HTML inclus)
- Matériau/composition (si présent en FR)
- Contexte : glossaire de la langue cible et instructions e-commerce

#### Permissions requises
- **`tabs`** : détecter et gérer les onglets Basecat (FR et langues cibles)
- **`storage`** : sauvegarder la clé API OpenAI de manière synchronisée
- **`scripting`** : injecter les scripts de traduction/validation et modifier les favicons
- **`sidePanel`** : afficher le panneau latéral d'interface
- **`host_permissions`** :
  - `https://*.orchestra.cc/*` et `https://*.back.orchestra.cc/*` : accéder aux pages produits Basecat et envoyer les requêtes de validation
  - `https://api.openai.com/*` : appeler l'API de traduction

### Dépannage

#### Traduction
- **« Ouvrez d'abord la page FR… »** : ouvrez l'onglet source FR (`loc_data=fr_FR`) avant de lancer la traduction
- **« CKEDITOR non disponible / instance introuvable »** : attendez le chargement complet de la page; l'extension réessaye automatiquement (500ms, puis 1s)
- **« Aucune langue à traduire »** : ouvrez d'abord les onglets cibles via « Ouvrir les langues sélectionnées »
- **« ID produit introuvable »** : vérifiez que l'URL contient bien le paramètre `id=...`
- **Champs vides après traduction** : consultez la section "Champ vide" du panneau pour identifier les champs non remplis
- **Matériau non traduit** : normal si le champ est vide en FR; le champ n'est traduit que s'il existe en français
- **Erreurs API OpenAI** : 
  - Vérifier le format de la clé (préfixe `sk-`)
  - Vérifier les quotas et crédits sur platform.openai.com
  - Vérifier la connectivité réseau

#### Validation
- **« Bouton 'Enregistrer' introuvable »** : vérifiez que vous êtes sur `ur=R` (rédaction), pas sur `ur=V` (validation)
- **« Bouton 'Valider' introuvable »** : assurez-vous d'être sur `ur=V`; utilisez « Étape de validation » pour y accéder
- **Popup "Propriétés requises vides"** : l'extension bloque ces popups mais les détecte; vérifiez les champs obligatoires
- **Photos non validées** : seules les sections avec images sont validées; les couleurs sans photo sont ignorées
- **Validation échoue** : vérifiez que tous les champs obligatoires sont remplis (titre, description)

#### Interface
- **Favicons ne s'affichent pas** : cliquez sur « 🎨 Coloriser les onglets » pour forcer l'application
- **Barres de progression bloquées** : rechargez l'extension ou fermez/rouvrez le panneau latéral
- **Sections ne se replient pas** : cliquez bien sur le titre de la section (avec la flèche ▼)

### Limitations

#### Traduction
- **Coût API** : 3 appels OpenAI par langue (titre + description + matériau si présent), le coût augmente avec le nombre de langues
- **Temps de traduction** : dépend de la taille des contenus et de la réactivité de l'API OpenAI
- **HTML conservé** : le balisage HTML de la description est préservé mais peut nécessiter une relecture
- **Glossaires statiques** : les fichiers `glossary_*.json` doivent être maintenus manuellement

#### Validation
- **Validation séquentielle** : les langues sont validées l'une après l'autre (non parallèle)
- **Champs obligatoires** : la validation échoue si titre ou description sont vides
- **Photos multiples** : toutes les couleurs avec images sont validées; impossible de sélectionner individuellement
- **Popups bloquées** : les popups d'erreur sont détectées mais peuvent parfois apparaître brièvement

#### Général
- **Connexion réseau** : requiert une connexion stable pour les appels API et la validation AJAX
- **Permissions étendues** : nécessite `host_permissions` pour Orchestra et OpenAI
- **Multi-fenêtres** : fonctionne uniquement dans la fenêtre courante (`currentWindow: true`)

### Développement

#### Modification et test
- Modifier les fichiers du projet
- Recharger l'extension dans `chrome://extensions` (icône ↻)
- Ouvrir la console développeur du panneau latéral pour voir les logs détaillés
- Utiliser la console du service worker (`background.js`) pour le debug avancé

#### Structure des logs
- 🚀 Début d'opération
- 📖 Extraction de données
- 🌐 Traduction en cours
- 💉 Injection de contenu
- ✅ Opération réussie
- ❌ Erreur
- ⚠️ Avertissement
- 📸 Validation photos
- 🎨 Gestion favicons
- 🔍 Détection/recherche

#### Ressources exposées
- Les glossaires sont exposés via `web_accessible_resources` dans le manifest
- Chargement avec `chrome.runtime.getURL('glossary_XX.json')`
- Format JSON : tableau d'objets `{word_source, word_replace}`

### Changelog

#### Version actuelle (non versionnée)
**Nouvelles fonctionnalités :**
- ✨ Traduction du champ matériau/composition
- ✅ Système complet de validation automatique (enregistrement + photos + description)
- 🎨 Favicons colorées dynamiques par produit avec code langue
- 📊 Barres de progression par produit et par langue
- 🔍 Détection automatique des champs vides post-traduction
- 🗑️ Bouton de fermeture des onglets traduits
- 📍 Script de redirection pour maintenir le contexte FR
- 🧩 Sections collapsibles dans l'interface
- 🔄 Bouton "Étape de validation" pour navigation ur=V

**Améliorations :**
- Interface utilisateur modernisée avec codes couleur
- Gestion robuste des popups avec MutationObserver
- Système de retry automatique (3 tentatives)
- Logs détaillés pour le debugging
- Gestion conditionnelle du matériau (uniquement si présent en FR)
- Marqueur `data-should-have-material` pour validation

**Corrections :**
- Gestion des langues non supportées dans les barres de progression
- Validation photos : ignore les sections sans image
- Blocage des popups d'erreur pendant la validation

### Ajouter une nouvelle langue

L'extension utilise désormais un système de configuration centralisé pour gérer les langues. Pour ajouter une nouvelle langue, consultez le fichier **[AJOUTER-UNE-LANGUE.md](AJOUTER-UNE-LANGUE.md)** qui contient la documentation complète étape par étape.

**Résumé rapide :**
1. Ajouter la configuration dans `languages-config.js`
2. Créer le fichier glossary correspondant (`glossary_XX.json`)
3. Mettre à jour `manifest.json` pour exposer le nouveau glossary
4. Recharger l'extension

Tous les autres fichiers s'adapteront automatiquement grâce au système de configuration centralisé.

### Roadmap (suggestions)
- [ ] Historique des traductions
- [ ] Mode hors ligne avec cache
- [ ] Prévisualisation avant injection
- [ ] Rollback/annulation des traductions