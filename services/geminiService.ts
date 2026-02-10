
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
      model: 'gemini-2.5-flash', 
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
      model: 'gemini-2.5-flash',
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
            model: 'gemini-2.5-flash', 
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: leftCornerBase64 } },
                    { text: "Image 1: Bottom-Left Corner" },
                    { inlineData: { mimeType: 'image/jpeg', data: rightCornerBase64 } },
                    { text: "Image 2: Bottom-Right Corner" },
                    { text: `
                        Analyze these Pokemon card corners to find the "Collector Number" and "Set Total".
                        
                        Valid Formats:
                        1. Fraction: "058/102", "112/165" (Number/Total)
                        2. Trainer Gallery: "TG13/TG30"
                        3. Galarian Gallery: "GG01/GG70"
                        4. Shiny Vault: "SV50/SV94"
                        5. Promos: "SWSH123", "SVP001", "XY12"
                        6. Secret Rares: "205/198" (Number > Total)

                        Output Requirements:
                        - Combine parts if split across corners.
                        - Ignore copyright years (e.g. 2023).
                        - Ignore artist names.
                        
                        Return JSON: 
                        { 
                            "normalizedId": "string (e.g. 058/102 or TG13/TG30)", 
                            "confidence": number (0.0 to 1.0) 
                        }
                    `}
                ]
            },
            config: {
                responseMimeType: "application/json",
            }
        });
        console.timeEnd("Gemini:OCR");

        const rawText = response.text;
        console.debug("[Gemini] Raw OCR Response:", rawText);

        const result = JSON.parse(cleanJson(rawText));
        
        let cleanId = result.normalizedId;
        if (cleanId) {
            cleanId = cleanId.replace(/\s+/g, '').toUpperCase();
            // Refined Regex for ID validation
            // Supports: 123/456, TG12/TG30, SWSH123, SV12, GG01/GG70
            const idRegex = /^([A-Z]{0,5})?\d+([A-Z]{0,5})?(\/([A-Z]{0,5})?\d+)?$/;
            
            if (!idRegex.test(cleanId)) {
                console.warn("[Gemini] ID failed validation:", cleanId);
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
