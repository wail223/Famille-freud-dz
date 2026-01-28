
import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  // @ts-ignore
  const apiKey = process.env.API_KEY;
  
  // Vérifie si la clé est manquante ou si c'est encore le texte par défaut
  if (!apiKey || apiKey === "AIzaSyArdIzFUUDFMR510ylL-hmY-GvzuB2lQII") {
    console.error("❌ CLÉ API INVALIDE : Ouvrez le fichier .env et collez votre vraie clé API à la place du texte par défaut.");
    throw new Error("Clé API invalide. Modifiez le fichier .env avec votre vraie clé.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateRound = async (theme: string) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Utilisation du modèle Flash 2.0 plus stable et rapide
      contents: `Thème : ${theme}. 
      Génère un bloc JSON pour le jeu "Une Famille en Or" Édition Algérienne. 
      
      RÈGLES CRITIQUES :
      1. Langue : Utilise l'ALPHABET ARABE uniquement.
      2. Dialecte : Utilise la DARIJA ALGÉRIENNE.
      3. Contenu : Culture algérienne (ex: nourriture, bureaucratie, fêtes, transport).
      4. Format : EXACTEMENT 10 réponses classées par points décroissants.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            top_10: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                  points: { type: Type.NUMBER }
                },
                required: ["id", "text", "points"]
              }
            },
            anecdote_host: { type: Type.STRING }
          },
          required: ["question", "top_10", "anecdote_host"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Réponse vide de l'IA");
    }

    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("Erreur Gemini generateRound:", error);
    throw new Error(error.message || "Erreur lors de la génération");
  }
};

export const validateAnswer = async (input: string, top10: any[]) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Vérifie si la réponse "${input}" correspond à l'une de ces réponses en Darija : ${JSON.stringify(top10)}. 
      Prends en compte les synonymes et variations d'écriture en alphabet arabe. 
      Réponds EXCLUSIVEMENT en JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            match: { type: Type.BOOLEAN },
            id: { type: Type.NUMBER },
            message: { type: Type.STRING }
          },
          required: ["match", "message"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Erreur Gemini validateAnswer:", error);
    throw new Error(error.message || "Erreur de validation");
  }
};
