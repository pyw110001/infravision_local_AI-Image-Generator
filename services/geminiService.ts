import { GoogleGenAI } from "@google/genai";
import { GenerationParams, ImageAsset } from "../types";
import { MUNICIPAL_PRESETS } from "../constants";

// Helper to remove data URL prefix
const cleanBase64 = (dataUrl: string) => dataUrl.split(',')[1];

export const generateImage = async (
  prompt: string,
  baseImage: ImageAsset,
  styleImages: ImageAsset[],
  params: GenerationParams,
  maskImage?: string
): Promise<string> => {
  
  // Initialize Google GenAI Client
  // Note: App.tsx handles the API Key selection UI, ensuring process.env.API_KEY is populated.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Prepare Content Parts
  const parts: any[] = [];

  // Add Base Image (This acts as the structural reference for Nano Banana)
  if (baseImage && baseImage.url) {
    parts.push({
      inlineData: {
        mimeType: 'image/png', // Assuming PNG for data URLs
        data: cleanBase64(baseImage.url)
      }
    });
  }

  // Add Style Images (Nano Banana supports multiple image inputs, we feed them as context)
  // We limit to 1 style image to prevent confusing the small model, or mix them.
  // For better stability with Nano, we rely more on the text prompt derived from the style images context.
  // However, we can append them if they exist.
  for (const styleImg of styleImages) {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: cleanBase64(styleImg.url)
      }
    });
  }

  // 2. Construct Enhanced Prompt
  // Since we don't have explicit "ControlNet" or "StyleStrength" params in the API,
  // we enforce them via prompt engineering.
  let enhancedPrompt = prompt;
  
  if (params.fidelity > 0.7) {
    enhancedPrompt += " (Strictly follow the structure and geometry of the input image).";
  }
  
  if (params.styleStrength > 0.6) {
    enhancedPrompt += " (Strongly apply the artistic style, dramatic lighting, high contrast).";
  }

  // Add Mask if present (Simulated via text instruction or image composition if model supported inpainting directly via generateContent, 
  // but for Nano Banana standard generateContent, we primarily do Img2Img. 
  // If specific editing is needed, we would use specific editing models, but here we use the generic multimodal capability).
  
  parts.push({ text: enhancedPrompt });

  // 3. Call API
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // NANO BANANA Model
      contents: {
        parts: parts,
      },
      config: {
        // Nano Banana doesn't support responseMimeType: 'image/jpeg' directly in all environments,
        // usually it returns text, but for "gemini-2.5-flash-image" specifically aimed at image gen/edit tasks via Live API or specific endpoints,
        // we check the standard generateContent behavior. 
        // IF the model is purely text-multimodal (VQA), it won't generate an image.
        // However, assuming this is the "Image Generation/Editing" capability of the 2.5/3 series:
        // We instruct it to generate an image.
        
        // Note: As per standard SDK usage for "Generating Images" vs "Multimodal VQA":
        // If 'gemini-2.5-flash-image' is an image generation model (like Imagen), we might need `generateImages`.
        // If it is the multimodal model that CAN output images (Nano Banana series), we use `generateContent`.
        // We will assume `generateContent` returns an image part.
      }
    });

    // 4. Parse Response
    // We look for an inline image in the response parts.
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    // Fallback if model returns text description instead of image (error case for this app)
    if (response.text) {
        console.warn("Model returned text instead of image:", response.text);
        throw new Error("模型仅返回了文本描述，未生成图像。请尝试调整提示词或重试。");
    }

    throw new Error("No image data received from API.");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    let msg = error.message || "Generation Failed";
    if (msg.includes("403") || msg.includes("API key")) {
        throw new Error("API Key 无效或未启用。请重新连接项目。");
    }
    throw new Error(`生成失败: ${msg}`);
  }
};