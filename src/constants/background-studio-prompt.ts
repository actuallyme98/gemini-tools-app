/** Editable default for Mockup Studio; the client submits the final text verbatim. */
export const MAX_BACKGROUND_PROMPT_LENGTH = 12000;

export const BACKGROUND_STUDIO_BASE_PROMPT = `Edit IMAGE 2 in place by transferring ONLY the surface artwork from the product in IMAGE 1 onto the corresponding product or products already present in IMAGE 2. Output ONE edited version of IMAGE 2.

IMAGE 1 — ARTWORK SOURCE: use its visible print, graphic, pattern, logo and lettering as the exact design source. Preserve every design detail, original colors, internal proportions, orientation and arrangement. Do not redraw, reinterpret, recolor, stylize, mirror, crop, invent or add design elements. Do not copy IMAGE 1's background, people, product silhouette, base color or construction into IMAGE 2.

IMAGE 2 — BASE PHOTO TO EDIT: retain the original scene, all people and subjects, faces, bodies, poses, hands, accessories, other objects, background, camera angle, framing, aspect ratio, lighting, shadows, reflections and depth of field. Do not remove or replace people or subjects, relocate products, replace the background, crop, zoom, reframe or relight the photo. Preserve everything outside the artwork regions as closely as possible.

TARGET PRODUCTS: identify the corresponding product type and visible printable surface in IMAGE 2. This applies to any compatible product, including apparel, bags, drinkware, phone cases, packaging and other printed objects; do not assume a specific product, wearer, gender or number of subjects. By default, apply the same source artwork to every matching target product in the photo, including multiple worn or displayed items. Leave unrelated products untouched. If no compatible target surface is visible, leave IMAGE 2 unchanged rather than inventing a product or changing the scene.

LOCAL ARTWORK REPLACEMENT ONLY: remove the existing artwork only from the target print regions and replace it with IMAGE 1's artwork. Keep each target product's existing base color, material, shape, construction, cut, seams, handles, silhouette and physical dimensions unchanged. Do not redesign the product or replace the entire product with the object from IMAGE 1.

PRINT SIZE AND PLACEMENT: preserve the artwork's width and height relative to the source product's corresponding surface, its aspect ratio and its relative placement on that surface. Map those same proportions to each target product; do not enlarge or shrink it merely to fill the available area. Do not use the same absolute pixel size across differently scaled products. Allow only the geometric projection needed for the target perspective, curvature, folds and existing occlusion. Keep the source design's intrinsic colors and details, allowing only the existing scene's illumination, fabric or surface shading and reflections for natural integration. Never paint over foreground hands, hair, straps or other occluding objects, or reveal hidden product areas.

MULTIPLE RESULTS: each output is another edit attempt with the same source artwork and base photo. Keep the scene, subjects, lighting, product geometry, relative print size and placement identical; do not introduce creative scene or placement variations.

OUTPUT: return only the edited base photo; no collage, extra products, annotations or new watermarks.`;
