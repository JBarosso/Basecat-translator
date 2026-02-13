import { getLanguageByShortCode, LANGUAGES } from './languages-config.js';

export async function fetchGlossary(languageCode) {
  const shortCode = languageCode.split('_')[0];
  const lang = getLanguageByShortCode(shortCode);
  
  if (!lang) {
    return []; // Retourne un tableau vide pour les langues non supportées
  }

  const response = await fetch(chrome.runtime.getURL(lang.glossaryFile));
  if (!response.ok) {
    return []; // Retourne un tableau vide si le fichier n'existe pas
  }
  const data = await response.json();
  return data;
}

export async function callOpenAI(inputText, targetLanguage, apiKey, customPrompt = '') {
  const shortCode = targetLanguage.split('_')[0];
  const lang = getLanguageByShortCode(shortCode);
  
  if (!lang) {
    throw new Error(`Langue non supportée: ${targetLanguage}`);
  }

  const glossary = await fetchGlossary(shortCode);
  const glossaryInstructions = glossary.map(entry => `${entry.word_source}: ${entry.word_replace}`).join(', ');

  // Construire les instructions avec les informations de toutes les langues
  let vectorStoreInfo = '';
  LANGUAGES.forEach(langItem => {
    if (langItem.assistantId) {
      vectorStoreInfo += `
  ${langItem.name}
  Assistant ID : ${langItem.assistantId}
  Nom : ${langItem.assistantName}
  Modèle : gpt-4o-mini
  Vectore store ID : ${langItem.vectorStoreId}
`;
    }
  });

  const baseInstructions = `
  Vous êtes un excellent traducteur et rédacteur spécialisé dans la traduction de fiches produits pour le site e-commerce shop-orchestra.com, qui se spécialise dans les vêtements pour enfants et les articles de puériculture. Votre mission est de traduire intégralement le contenu des fiches produits dans la langue cible indiquée (${shortCode}) de manière native.

  Avant toute autre action, vous devez vous référer aux données présentes dans le vectore store correspondant à la langue cible pour trouver la bonne traduction. Voici les détails des vectore stores pour chaque langue :${vectorStoreInfo}

  Pour chaque réponse, avant de l'afficher dans l'interface de la popup et permettre à l'utilisateur de copier la réponse, vous effectuerez un nettoyage en supprimant les mots indésirables tels que "markdown" et les guillemets simples ('), ainsi que d'autres mots ou caractères de vérification que vous pourrez ajouter dans le code à l'avenir.

  La réponse inclura uniquement la traduction du contenu et rien d'autre.

  Utilisez le glossaire suivant pour les traductions spécifiques : ${glossaryInstructions}.
  `;

  const finalInstructions = customPrompt 
      ? `${baseInstructions}\n\nInstructions spécifiques pour ce type de contenu :\n${customPrompt}`
      : baseInstructions;

  const requestBody = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an excellent translator." },
      {
        role: "user",
        content: `
          ${finalInstructions}
          Translate the following product description in native language and syntax of this language ${shortCode}:
          '${inputText}'
        `,
      },
    ],
  };

  console.log("Request Body: ", requestBody);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  console.log("Response object:", response);
  if (!response.ok) {
    console.error("Response error:", data.error);
    throw new Error(`API Error: ${data.error.message}`);
  }
  console.log("Response data:", data);

  return data;
} 