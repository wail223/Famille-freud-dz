
import { GoogleGenAI, Type } from "@google/genai";

// Initialisation stricte selon les recommandations de sécurité
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateRound = async (theme: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Thème : ${theme}. 
    Génère un bloc JSON pour le jeu "Une Famille en Or" Édition Algérienne. 
    
    RÈGLES CRITIQUES :
    1. Langue : Utilise l'ALPHABET ARABE (lettres arabes) uniquement.
    2. Dialecte : Utilise la DARIJA ALGÉRIENNE (parlé local).
    3. Contenu : Culture algérienne, humour, vie quotidienne (cuisine, bureaucratie, fêtes, transport).
    4. Format : 10 réponses classées de la plus populaire à la moins populaire.
    
    Exemple de style : "طوموبيل" au lieu de "Tomobil", "كوزينة" au lieu de "Kouzina".`,
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

  return JSON.parse(response.text);
};

export const validateAnswer = async (input: string, top10: any[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Vérifie si la réponse "${input}" correspond à l'une de ces réponses en Darija : ${JSON.stringify(top10)}. 
    Prends en compte les synonymes et les variations d'écriture en alphabet arabe. 
    Réponds en JSON.`,
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

  return JSON.parse(response.text);
};
