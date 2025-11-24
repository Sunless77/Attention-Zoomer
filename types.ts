
export enum ReadingDuration {
  Micro = 'micro',
  Abstract = 'abstract',
  Summary = 'summary',
  Explanation = 'explanation',
  Extended = 'extended',
}

export type ContentStyle = 'default' | 'story' | 'neutral' | 'structured';

export interface ReadingOption {
  value: ReadingDuration;
  label: string;
  description: string;
}

export interface GenerateRequest {
  article_content: string;
  reading_time_seconds: number;
  style: ContentStyle;
}

// Helper to format seconds into "1m 30s" or "45s"
export const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
};
