/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("Variável de ambiente API_KEY não está definida");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });


// --- Helper Functions ---
/**
 * Creates a fallback prompt to use when the primary one is blocked.
 * @param decade The decade string (e.g., "1940").
 * @returns The fallback prompt string.
 */
function getFallbackPrompt(decade: string): string {
    return `Create a photograph of the person in this image as if they were living in the ${decade}. The photograph should capture the distinct fashion, hairstyles, and overall atmosphere of that time period. Ensure the final image is a clear photograph that looks authentic to the era.`;
}

/**
 * Extracts the decade (e.g., "1950s") from a prompt string.
 * @param prompt The original prompt.
 * @returns The decade string or null if not found.
 */
function extractDecade(prompt: string): string | null {
    const match = prompt.match(/(\d{4}s)/);
    return match ? match[1] : null;
}

/**
 * Processes the Gemini API response, extracting the image or throwing an error if none is found.
 * @param response The response from the generateContent call.
 * @returns A data URL string for the generated image.
 */
function processGeminiResponse(response: GenerateContentResponse): string {
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        return `data:${mimeType};base64,${data}`;
    }

    const textResponse = response.text;
    console.error("API não retornou uma imagem. Resposta:", textResponse);
    throw new Error(`O AI model respondeu com texto em vez de uma imagem: "${textResponse || 'Nenhuma resposta de texto recebida.'}"`);
}

/**
 * A wrapper for the Gemini API call that includes a retry mechanism for internal server errors.
 * @param imagePart The image part of the request payload.
 * @param textPart The text part of the request payload.
 * @returns The GenerateContentResponse from the API.
 */
async function callGeminiWithRetry(imagePart: object, textPart: object): Promise<GenerateContentResponse> {
    const maxRetries = 3;
    const initialDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, textPart] },
            });
        } catch (error) {
            console.error(`Erro ao chamar a API do Gemini (Tentativa ${attempt}/${maxRetries}):`, error);
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            const isInternalError = errorMessage.includes('"code":500') || errorMessage.includes('INTERNAL');

            if (isInternalError && attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt - 1);
                console.log(`Erro interno detectado. Tentando novamente em ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error; // Re-throw if not a retriable error or if max retries are reached.
        }
    }
    // This should be unreachable due to the loop and throw logic above.
    throw new Error("Chamada da API do Gemini falhou após todas as tentativas.");
}


/**
 * Generates a decade-styled image from a source image and a prompt.
 * It includes a fallback mechanism for prompts that might be blocked in certain regions.
 * @param imageDataUrl A data URL string of the source image (e.g., 'data:image/png;base64,...').
 * @param prompt The prompt to guide the image generation.
 * @returns A promise that resolves to a base64-encoded image data URL of the generated image.
 */
export async function generateDecadeImage(imageDataUrl: string, prompt: string): Promise<string> {
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) {
    throw new Error("Formato de URL de imagem inválido. Esperado 'data:image/...;base64,...'");
  }
  const [, mimeType, base64Data] = match;

    const imagePart = {
        inlineData: { mimeType, data: base64Data },
    };

    // --- First attempt with the original prompt ---
    try {
        console.log("Tentando geração com prompt original...");
        const textPart = { text: prompt };
        const response = await callGeminiWithRetry(imagePart, textPart);
        return processGeminiResponse(response);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const isNoImageError = errorMessage.includes("O AI model respondeu com texto em vez de uma imagem");

        if (isNoImageError) {
            console.warn("Original prompt foi provavelmente bloqueado. Tentando novamente com prompt de fallback.");
            const decade = extractDecade(prompt);
            if (!decade) {
                console.error("Não foi possível extrair década do prompt, não é possível usar fallback.");
                throw error; // Re-throw the original "no image" error.
            }

            // --- Second attempt with the fallback prompt ---
            try {
                const fallbackPrompt = getFallbackPrompt(decade);
                console.log(`Tenta novamente com prompt de fallback para ${decade}...`);
                const fallbackTextPart = { text: fallbackPrompt };
                const fallbackResponse = await callGeminiWithRetry(imagePart, fallbackTextPart);
                return processGeminiResponse(fallbackResponse);
            } catch (fallbackError) {
                console.error("Falhou novamente com prompt de fallback.", fallbackError);
                const finalErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                throw new Error(`O AI falhou com ambos os prompts originais e de fallback. último erro: ${finalErrorMessage}`);
            }
        } else {
            // This is for other errors, like a final internal server error after retries.
            console.error("Erro inesperado durante a geração da imagem.", error);
            throw new Error(`O AI falhou ao gerar uma imagem. Detalhes: ${errorMessage}`);
        }
    }
}
