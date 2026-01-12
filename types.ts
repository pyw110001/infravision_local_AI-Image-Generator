export enum GenerationStatus {
  IDLE = 'IDLE',
  QUEUED = 'QUEUED',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ImageAsset {
  id: string;
  url: string; // Data URL
  file?: File;
  type: 'base' | 'style' | 'generated' | 'mask';
}

export interface GenerationParams {
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16';
  fidelity: number; // 0-1, mapped to ControlNet/ImagePrompt weight
  styleStrength: number; // 0-1, mapped to Guidance Scale or Refiner switch
  seed: number;
  lockedSeed: boolean;
  presetId: string;
  outputQuality: 'Speed' | 'Quality'; // Mapped to Fooocus performance
}

export interface ProjectVersion {
  id: string;
  parentId: string | null;
  timestamp: number;
  baseImageId: string;
  resultImageId?: string;
  prompt: string;
  params: GenerationParams;
  status: GenerationStatus;
  errorMessage?: string;
  isFavorite: boolean;
}

export interface Project {
  id: string;
  name: string;
  updatedAt: number;
  versions: ProjectVersion[];
  activeVersionId: string | null;
  assets: Record<string, ImageAsset>; // Map id -> Asset
}

export interface Preset {
  id: string;
  category: 'Road' | 'Bridge' | 'Tunnel' | 'Landscape';
  name: string;
  promptTemplate: string;
  fooocusStyles: string[]; // List of Fooocus Style names
  defaultParams: Partial<GenerationParams>;
}