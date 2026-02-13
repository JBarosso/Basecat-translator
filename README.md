# 🐱 Basecat Translator

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/JBarosso/Basecat-translator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Vite%20%7C%20Tailwind%20%7C%20Shadcn-blueviolet)](https://reactjs.org/)

**Basecat Translator** est une extension Chrome puissante conçue pour automatiser et simplifier la traduction et la validation des fiches produits sur le PIM Basecat. Elle utilise l'IA (OpenAI GPT-4o-mini) pour générer des traductions de haute qualité tout en préservant la structure HTML originale.

---

## ✨ Fonctionnalités

- 🌍 **Traduction Multi-langue** : Traduisez vos fiches produits en Espagnol, Italien, Allemand, Néerlandais et Grec en un clic.
- 🤖 **Intelligence Artificielle** : Intégration fluide avec OpenAI (GPT-4o-mini) pour des traductions contextuelles et précises.
- ✅ **Validation en Série** : Vérifiez instantanément l'état de validation (photos et descriptions) de tous vos onglets ouverts.
- 🌓 **Mode Sombre / Clair** : Une interface moderne et adaptable à votre confort visuel.
- 📊 **Statistiques Détaillées** : Suivi précis du nombre de traductions, des jetons consommés et du coût estimé par langue.
- ⏳ **Flux de Travail Optimisé** :
    - Ouverture automatique des onglets cibles.
    - Traduction par lot ou par page individuelle.
    - Fermeture groupée des onglets après traitement.
    - Auto-masquage de la progression pour une interface épurée.

## 🚀 Installation

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/JBarosso/Basecat-translator.git
   cd basecat-translator
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Compiler le projet**
   ```bash
   npm run build
   ```

4. **Charger dans Chrome**
   - Allez sur `chrome://extensions/`.
   - Activez le **Mode développeur**.
   - Cliquez sur **Charger l'extension non empaquetée**.
   - Sélectionnez le dossier `dist` à la racine du projet.

## 🛠️ Configuration

Une fois l'extension installée :
1. Cliquez sur l'icône de l'extension dans la barre latérale.
2. Cliquez sur l'icône **Paramètres (⚙️)** dans le header.
3. Entrez votre clé API OpenAI (`sk-...`).
4. Sélectionnez vos langues cibles dans la liste.

## 💻 Stack Technique

- **Frontend** : [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling** : [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- **Icons** : [Lucide React](https://lucide.dev/)
- **Storage** : Chrome Storage API (Sync & Local)
- **API** : OpenAI Chat Completions (gpt-4o-mini)

## 📄 Licence

Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.

---

*Développé avec ❤️ pour optimiser la gestion de contenu e-commerce.*
