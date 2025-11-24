
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { GenerateRequest } from '../types';

let client: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI => {
  if (!client) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY not found in environment variables");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
};

export const generateReadingContent = async (request: GenerateRequest): Promise<string> => {
  const ai = getClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7, // Slightly creative for "enriched" modes, but grounded.
      },
      contents: [
        {
          parts: [
            {
              text: JSON.stringify(request)
            }
          ]
        }
      ]
    });

    return response.text || "Could not generate content. Please try again.";
  } catch (error) {
    console.error("Gemini API Error (Content):", error);
    throw new Error("Failed to process the article. Please check your connection and try again.");
  }
};

export const generateCoverImage = async (topicOrSnippet: string): Promise<string | null> => {
  const ai = getClient();
  
  try {
    // Truncate to avoid token limits if raw text is huge, though flash handles it well.
    // We just need a thematic prompt.
    const promptContext = topicOrSnippet.slice(0, 800);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Create a minimalistic, high-quality, abstract editorial cover image representing this topic: "${promptContext}". 
            Style: Modern, spiritual, ethereal, high-end magazine aesthetic. 
            Colors: Soft slates, hazy violets, muted organic tones. No text on image.`
          }
        ]
      }
    });

    // Iterate through parts to find the image (standard for nano banana / flash-image)
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Gemini API Error (Image):", error);
    // Fail silently for image, it's decorative
    return null;
  }
};
