
import { GoogleGenAI, Modality } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const dataUrlToBlob = (dataUrl: string): { data: string; mimeType: string } => {
    const [header, base64Data] = dataUrl.split(',');
    if (!header || !base64Data) {
        throw new Error('Invalid data URL');
    }
    const mimeType = header.split(':')[1].split(';')[0];
    return { data: base64Data, mimeType };
};

export const generateImageEdit = async (
  imageDataUrl: string,
  prompt: string
): Promise<string> => {
  try {
    const { data, mimeType } = dataUrlToBlob(imageDataUrl);

    const imagePart = {
      inlineData: {
        data,
        mimeType,
      },
    };

    const textPart = {
      text: prompt || "Subtly enhance the lighting and shadows to make the image more photorealistic.",
    };
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    for (const part of response.candidates?.[0]?.content.parts ?? []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        const imageMimeType = part.inlineData.mimeType;
        return `data:${imageMimeType};base64,${base64ImageBytes}`;
      }
    }

    throw new Error('No image was generated. The model may have refused the prompt.');
  } catch (error) {
    console.error('Error generating image with Gemini:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during image generation.";
    throw new Error(`Failed to generate image: ${errorMessage}`);
  }
};
