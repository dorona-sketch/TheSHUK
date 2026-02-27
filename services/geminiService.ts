
import { GoogleGenAI, Type } from "@google/genai";
import { getEnv } from "../utils/env";

export const isGeminiConfigured = (): boolean => {
  return !!(getEnv('GEMINI_API_KEY') || getEnv('API_KEY'));
};

let didWarnMissingKey = false;

const getClient = () => {
  const apiKey = getEnv('GEMINI_API_KEY') || getEnv('API_KEY');
  
  if (!apiKey) {
    if (!didWarnMissingKey) {
      console.warn("Gemini API key missing (set VITE_GEMINI_API_KEY). AI features will return mock data.");
      didWarnMissingKey = true;
    }
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



const isObject = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const parseJsonObject = (raw: string | undefined): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(cleanJson(raw));
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const parseString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null;
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

// --- Visual Identification (Core) ---
export const identifyCardFromImage = async (base64Image: string): Promise<{ cardName: string, setName: string, number: string, rarity: string } | null> => {
    const client = getClient();
    if (!client) return null;

    try {
        console.time("Gemini:IdentifyCard");
        const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: `Identify this Pokemon card details. Return JSON with cardName, setName, number, and rarity.` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        cardName: { type: Type.STRING },
                        setName: { type: Type.STRING },
                        number: { type: Type.STRING, description: "Collector number like 058/102" },
                        rarity: { type: Type.STRING }
                    },
                    required: ["cardName", "setName"]
                }
            }
        });
        console.timeEnd("Gemini:IdentifyCard");
        
        const parsed = parseJsonObject(response.text);
        if (!parsed) return null;

        const cardName = parseString(parsed.cardName);
        const setName = parseString(parsed.setName);
        if (!cardName || !setName) return null;

        const number = parseString(parsed.number) ?? "";
        const rarity = parseString(parsed.rarity) ?? "";

        return { cardName, setName, number, rarity };
    } catch (e) {
        console.warn("Visual ID failed", e);
        return null;
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
                        You are an OCR engine for Pokemon Cards. Analyze these corner images to find the Collector Number / ID.
                        
                        The ID is usually found in the bottom-left or bottom-right corner.
                        
                        Common Formats:
                        1. Fraction: "058/102", "112/165", "5/18"
                        2. Subset / Gallery: "TG13/TG30", "GG01/GG70", "SV50/SV94", "RC29/RC32"
                        3. Promos: "SWSH123", "SVP001", "SM10"
                        4. Simple: "TG13", "GG05" (Sometimes total is missing)
                        
                        Instructions:
                        - Extract the ID exactly as seen.
                        - Prefer "Number/Total" format if visible.
                        - If you see "TG13" and "TG30", return "TG13/TG30".
                        - If you see "112" and "165", return "112/165".
                        - Ignore copyright years (e.g. 1999, 2022).
                        - Ignore artist names.
                        - Provide a normalized version (uppercase, remove spaces).
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

        const result = parseJsonObject(response.text);
        if (!result) return { normalized: null, raw: '', confidence: 0 };

        let cleanId = parseString(result.normalizedId);
        if (cleanId) {
            // Basic cleaning
            cleanId = cleanId.trim().toUpperCase().replace(/\s/g, '');
            // Validate: Must contain at least one digit
            if (!/\d/.test(cleanId)) {
                return { normalized: null, raw: cleanId, confidence: 0 };
            }
        }

        return {
            normalized: cleanId || null,
            raw: parseString(result.normalizedId) || '',
            confidence: typeof result.confidence === 'number' && Number.isFinite(result.confidence) ? result.confidence : 0
        };
    } catch (e) {
        console.warn("OCR failed", e);
        return { normalized: null, raw: '', confidence: 0 };
    }
};
