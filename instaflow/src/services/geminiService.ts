
import { GoogleGenAI, Type } from "@google/genai";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const suggestAutomation = async (caption: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `The following is an Instagram post caption: "${caption}". 
    Suggest 3 potential automation strategies for this post. 
    Each strategy should have:
    1. A keyword to look for.
    2. A friendly DM reply.
    3. A brief public comment reply to post back to the user to boost engagement.
    4. Sentiment goal (e.g., 'Interested', 'Happy').`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            keyword: { type: Type.STRING },
            reply: { type: Type.STRING },
            publicReply: { type: Type.STRING },
            sentiment: { type: Type.STRING }
          },
          required: ["keyword", "reply", "publicReply", "sentiment"]
        }
      }
    }
  });

  try {
    // response.text is a property, not a method.
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
};

export const generateSmartResponse = async (comment: string, context: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Comment: "${comment}". Post Context: "${context}". Generate a personalized, high-energy DM response that feels human.`,
  });
  // response.text is a property, not a method.
  return response.text;
};
