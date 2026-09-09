export type MatchMode = 'face' | 'template';

export interface VideoMatchResult {
  timestamp_seconds: number;
  frame_number: number;
  confidence: number;
  bbox: [number, number, number, number];
  frame_url: string;
  scale?: number;
}

export interface VideoMatchResponse {
  total_frames_scanned: number;
  video_duration_seconds: number;
  fps: number;
  matches: VideoMatchResult[];
  mode?: MatchMode;
}

export interface LiveFaceResult {
  bbox: [number, number, number, number];
  confidence: number;
  is_match: boolean;
}

export interface LiveMatchResponse {
  matches: LiveFaceResult[];
  face_count: number;
  processing_ms: number;
}

export interface EmotionFace {
  dominant_emotion: string;
  emotions: Record<string, number>;
  region: { x: number; y: number; w: number; h: number };
}

export interface EmotionResponse {
  dominant_emotion: string;
  emotions: Record<string, number>;
  face_detected: boolean;
  faces: EmotionFace[];
}

export interface Face {
  id: number;
  name: string;
  image_path: string;
  created_at: string;
}

export interface IdentifyResult {
  bbox: [number, number, number, number];
  name: string;
  confidence: number;
  face_id: number | null;
}

export interface IdentifyResponse {
  results: IdentifyResult[];
  face_count: number;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}
