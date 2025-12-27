
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client using the API key from the environment variable as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateRound = async (theme: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Thème : ${theme}. Génère un bloc JSON pour le jeu "Une Famille en Or" Édition Algérienne. 
    Les réponses doivent être basées sur la culture populaire algérienne, le quotidien, et l'humour local. 
    Mélange Darija et Français comme on parle à Alger/Oran/Constantine.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING },
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
    contents: `Vérifie si la réponse proposée "${input}" correspond sémantiquement à l'une de ces réponses algériennes : ${JSON.stringify(top10)}. 
    Tiens compte de l'argot algérien, des synonymes (ex: tomobil/auto, dar/maison, khobz/pain). 
    Réponds en JSON uniquement.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          match: { type: Type.BOOLEAN },
          id: { type: Type.NUMBER, description: "ID de la réponse trouvée ou null" },
          message: { type: Type.STRING, description: "Un petit message d'encouragement en Darija" }
        },
        required: ["match", "message"]
      }
    }
  });

  return JSON.parse(response.text);
};
