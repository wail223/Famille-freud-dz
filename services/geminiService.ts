
import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  // Utilisation de process.env.API_KEY injecté par Vite
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Clé API Gemini manquante. Veuillez configurer API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateRound = async (theme: string) => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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

  return JSON.parse(response.text || "{}");
};

export const validateAnswer = async (input: string, top10: any[]) => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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
};
