import type { PromptOptions } from "../pages/IdeaGeneratorPage";
import type { ImageAnalysis } from "../services/api.service";
import { formatToBulletLines } from "./idea.util";

export const toGenerateNewIdeaPrompt = (
  analysis: ImageAnalysis,
  options: PromptOptions,
  count: number
) => {
  const globalRules = formatToBulletLines(options.globalRules);
  const themeRequirement = formatToBulletLines(options.themeRequirement);
  const forEachIdea = formatToBulletLines(options.forEachIdea);
  const additionalRules = formatToBulletLines(options.additionalRules);
  const important = formatToBulletLines(options.important);

  return `Based on the PROVIDED REFERENCE IMAGE and this product profile:
  ${JSON.stringify(analysis, null, 2)}
  
  You are directly editing the USER-UPLOADED IMAGE.
n  This is a REAL IMAGE EDIT, not image generation.
  
  ================================
  CORE RULE:
  - The uploaded image is the SINGLE SOURCE OF TRUTH
  - Preserve the original composition, framing, and perspective
  - Edit the existing image, do NOT create a new one
  
  ================================
  PRODUCT LOCK:
  - Keep the same physical product instance
  - Same product type, structure, shape, proportions, and materials
  - Same camera angle and realistic lighting behavior
  - Do NOT recreate, replace, or re-render the product
  
  ================================
  EDIT SCOPE (DESIGN ONLY):
  - ONLY change the surface DESIGN / GRAPHIC
  - Design area size, position, alignment, and orientation MUST stay identical
  - Follow original surface curvature and perspective
  
  NOT allowed:
  - changing product form, material, or texture
  - adding text, logos, or watermarks
  - adding elements outside the original design area
  
  ================================
  BACKGROUND (SUBTLE VARIATION ALLOWED):
  - Background must stay based on the original image
  - Allowed: slight tone, brightness, or realistic texture variation
  - Background must remain minimal and non-distracting
  
  NOT allowed:
  - background replacement
  - studio or abstract backdrops
  - new background objects
  
  ================================
  DESIGN VARIATIONS:
  Generate ${count} variations of the SAME product.
  Each variation:
  - Uses the SAME image
  - Changes ONLY the surface design
  - Has ONE clear theme
  
  ================================
  THEME REQUIREMENT:
  ${themeRequirement}
  
  ================================
  FOR EACH PRODUCT IDEA:
  ${forEachIdea}
  
  ================================
  ${additionalRules ? `ADDITIONAL RULES:\n${additionalRules}` : ""}
  
  ================================
  ${important ? `IMPORTANT:\n${important}` : ""}
  
  ================================
  GLOBAL RULES:
  - No copyrighted characters, brands, or logos
  - No watermark, no text
  - Each idea is a NEW SURFACE DESIGN ONLY
  - Write everything in Vietnamese
  ${globalRules}
  
  ================================
  OUTPUT FORMAT:
  Return JSON array:
  [
    { "title": "", "description": "", "prompt": "" }
  ]
   `;
};
