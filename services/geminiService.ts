
import { GoogleGenAI, Type } from "@google/genai";
import { getEnv } from '../utils/env';

const getClient = () => {
  const apiKey = getEnv('API_KEY');
  
  if (!apiKey) {
    console.warn("API_KEY is missing. AI features will return mock data.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to strip markdown code fences from JSON strings
const cleanJson = (text: string | undefined): string => {
    if (!text) return "{}";
    try {
        return text.replace(/^```json\s*/, '').replace(/```\s*$/, '').replace(/```/g, '').trim();
    } catch (e) {
        return "{}";
    }
};

// --- Helper: Generate Description ---
export const generateCardDescription = async (title: string, details: string): Promise<string> => {
  const client = getClient();
  if (!client) return "Professional description unavailable (Missing API Key).";
  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Write a short, engaging sales description (max 50 words) for: ${title}. Details: ${details}. Tone: Enthusiastic collector.`,
    });
    return response.text || "No description generated.";
  } catch (error) {
    console.error("Error generating description:", error);
    return "Failed to generate description.";
  }
};

// --- Maps Grounding ---
export const getLocationInfo = async (location: string): Promise<{ text: string, mapLinks: any[] }> => {
  const client = getClient();
  if (!client) return { text: "Location services unavailable", mapLinks: [] };

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a 1-sentence description of: ${location}.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text = response.text || "No information found.";
    const candidates = response.candidates;
    const groundingChunks = candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const mapLinks = groundingChunks
        .filter((c: any) => c.web?.uri || c.maps?.uri)
        .map((c: any) => ({
            uri: c.maps?.uri || c.web?.uri,
            title: c.maps?.title || c.web?.title || "View on Google Maps"
        }));

    return { text, mapLinks };
  } catch (error) {
    console.error("Location info error", error);
    return { text: "Could not fetch location info.", mapLinks: [] };
  }
};

// --- OCR Extraction (Used by CardRecognitionService) ---
export const performOcrOnCorners = async (
    leftCornerBase64: string, 
    rightCornerBase64: string
): Promise<{ normalized: string | null, raw: string, confidence: number }> => {
    const client = getClient();
    if (!client) return { normalized: null, raw: '', confidence: 0 };

    try {
        console.time("Gemini:OCR");
        const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: leftCornerBase64 } },
                    { text: "Image 1: Bottom-Left Corner" },
                    { inlineData: { mimeType: 'image/jpeg', data: rightCornerBase64 } },
                    { text: "Image 2: Bottom-Right Corner" },
                    { text: `
                        You are an OCR engine for Pokemon Cards. Analyze these corner images to find the Collector Number and Set Total.
                        
                        Valid Formats to look for:
                        1. "058/102" (Standard Fraction)
                        2. "TG13/TG30" (Trainer Gallery)
                        3. "SV50/SV94" (Shiny Vault)
                        4. "SWSH123" or "SVP001" (Black Star Promos)
                        5. "GG01/GG70" (Galarian Gallery)
                        
                        Instructions:
                        - Return the ID exactly as seen.
                        - If you see "112/165" return it.
                        - If you see "TG13" return it.
                        - Ignore copyright dates (e.g. 2022, 1999).
                        - Ignore artist names.
                        - If ambiguous, favor the format matching [Letter][Number] or [Number]/[Number].
                    `}
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        normalizedId: {
                            type: Type.STRING,
                            description: "The extracted ID. e.g. '058/102', 'TG13/TG30', 'SWSH123'"
                        },
                        confidence: {
                            type: Type.NUMBER,
                            description: "Confidence 0.0 to 1.0"
                        }
                    },
                    required: ["normalizedId", "confidence"]
                }
            }
        });
        console.timeEnd("Gemini:OCR");

        const rawText = response.text;
        const result = JSON.parse(cleanJson(rawText));
        
        let cleanId = result.normalizedId;
        if (cleanId) {
            // Basic cleaning
            cleanId = cleanId.trim().toUpperCase();
            // Validate: Must contain at least one digit
            if (!/\d/.test(cleanId)) {
                return { normalized: null, raw: cleanId, confidence: 0 };
            }
        }

        return {
            normalized: cleanId || null,
            raw: result.normalizedId || '',
            confidence: result.confidence || 0
        };
    } catch (e) {
        console.warn("OCR failed", e);
        return { normalized: null, raw: '', confidence: 0 };
    }
};
