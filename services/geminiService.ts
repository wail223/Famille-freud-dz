
import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  // @ts-ignore
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error("❌ CLÉ API MANQUANTE");
    throw new Error("Clé API manquante. Vérifiez le fichier .env");
  }
  
  return new GoogleGenAI({ apiKey });
};

export const generateRound = async (theme: string) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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
    
    let msg = error.message || "Erreur lors de la génération";
    
    // Détection des erreurs courantes de clé API
    if (msg.includes("403") || msg.includes("400") || msg.includes("API key")) {
      msg = "⛔ CLÉ INVALIDE. La clé Firebase ne fonctionne pas pour l'IA. Créez une clé gratuite sur : aistudio.google.com";
    }
    
    throw new Error(msg);
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
    let msg = error.message;
    if (msg.includes("403") || msg.includes("API key")) {
        msg = "⛔ Clé API invalide. Utilisez une clé de aistudio.google.com";
    }
    throw new Error(msg);
  }
};
