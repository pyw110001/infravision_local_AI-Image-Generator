import { Preset } from './types';

// Configuration for Local Fooocus
export const FOOOCUS_API_URL = "http://127.0.0.1:8888/v1/generation/text-to-image";

export const SYSTEM_INSTRUCTION = `
(此提示词用于本地 Fooocus 负面提示词参考，或作为 Prompt 后缀)
Safe content, high resolution, photorealistic, 8k, architectural visualization.
`;

export const MUNICIPAL_PRESETS: Preset[] = [
  {
    id: 'road-urban-arterial',
    category: 'Road',
    name: '城市主干路 (日景)',
    promptTemplate: 'photorealistic urban arterial road, 6 lanes, asphalt pavement, crisp white thermoplastic lane markings, median strip with manicured low shrubs, modern LED streetlights, clear blue sky, city skyline in background, 4k visualization, cinematic lighting',
    fooocusStyles: ['Fooocus V2', 'Fooocus Photograph', 'MRE Cinematic Dynamic'],
    defaultParams: { fidelity: 0.8, styleStrength: 0.6 }
  },
  {
    id: 'bridge-highway',
    category: 'Bridge',
    name: '高架桥/立交 (工程风)',
    promptTemplate: 'concrete highway viaduct, precast box girder structure, clean concrete texture, safety crash barriers, smooth asphalt deck, soft sunlight, highly detailed engineering structure, aerial view, architectural photography',
    fooocusStyles: ['Fooocus V2', 'Fooocus Sharp', 'SAI 3D Model'],
    defaultParams: { fidelity: 0.9, styleStrength: 0.4 }
  },
  {
    id: 'street-scape',
    category: 'Landscape',
    name: '街道景观提升 (人视)',
    promptTemplate: 'urban streetscape renovation, permeable paver sidewalks, granite curbstones, mature street trees providing canopy, pedestrian friendly furniture, vibrant commercial frontage, warm morning lighting, depth of field',
    fooocusStyles: ['Fooocus V2', 'Fooocus Masterpiece', 'Ads Luxury'],
    defaultParams: { fidelity: 0.7, styleStrength: 0.7 }
  },
  {
    id: 'tunnel-interior',
    category: 'Tunnel',
    name: '隧道内部 (现代)',
    promptTemplate: 'modern tunnel interior, fire-resistant wall cladding, LED strip lighting, emergency signage, asphalt road surface, cinematic lighting, vanishing point perspective, hyperrealistic',
    fooocusStyles: ['Fooocus V2', 'Fooocus Futuristic', 'MRE Cinematic Dynamic'],
    defaultParams: { fidelity: 0.85, styleStrength: 0.5 }
  }
];

export const PLACEHOLDER_IMAGE = 'https://picsum.photos/800/600';