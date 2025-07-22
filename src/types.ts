export interface Scene {
  sceneNumber: number;
  voiceover: string;
  visualPrompt: string;
  imageUrl?: string; // Base64 data URL
  audioUrl?: string; // Blob URL for local playback
  audioFile?: File; // The actual file for uploading
  videoUrl?: string; // Blob URL for local video playback
  videoFile?: File; // The actual video file for uploading
  isGeneratingImage: boolean;
}

export interface Reel {
  id?: string; // The document ID from Firestore
  title: string;
  scenes: Scene[];
  createdAt: Date;
}