import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

/**
 * Initializes the Gemini API client with the provided API key.
 * This must be called before any generation functions.
 * @param apiKey The user's Google AI API key.
 */
export const initGemini = (apiKey: string) => {
  if (!apiKey) {
    ai = null;
    return;
  }
  ai = new GoogleGenAI({ apiKey });
};

/**
 * Generates an image using the Gemini API.
 * Throws an error if the client is not initialized.
 * @param prompt The visual prompt for the image.
 * @returns A promise that resolves to a base64 data URL of the generated image.
 */
export const generateImage = async (prompt: string): Promise<string> => {
  if (!ai) {
    throw new Error("Gemini API key not provided or invalid. Please set it in the settings.");
  }
  
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: `High-quality, vibrant, professional photo conveying success and financial empowerment. ${prompt}`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '9:16',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error("Image generation failed: No images returned from API.");
    }
  } catch (error) {
    console.error("Error generating image with Gemini:", error);
    // Attempt to provide a more user-friendly error message
    const message = (error as Error)?.message || 'An unknown error occurred.';
    if (message.includes('API key not valid')) {
       throw new Error("Your Gemini API Key is not valid. Please check and try again.");
    }
    throw new Error(`Failed to generate image. API Error: ${message}`);
  }
};