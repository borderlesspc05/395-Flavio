export type MagnusWave =
  | 'diagnostico'
  | 'design'
  | 'difusao'
  | 'dominio'
  | 'frameworks'
  | 'reports'
  | 'global';

export type RagSource =
  | 'initialForms'
  | 'domainWaveData'
  | 'actionCanvases'
  | 'objectives'
  | 'reports'
  | 'consultantFrameworks'
  | 'docs'
  | 'conversations';

export type RagSourceDocument = {
  userId: string;
  organizationId?: string | null;
  wave: MagnusWave;
  source: RagSource | string;
  sourceId: string;
  title?: string;
  text: string;
  metadata?: Record<string, unknown>;
  updatedAt?: string | Date | null;
};

export type RagSearchResult = {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
  similarity?: number;
};

export type RagSearchResponse = {
  context: string;
  chunkCount: number;
};

export type ReindexResult = {
  ok: boolean;
  userId: string;
  indexedDocuments: number;
  errors: string[];
  message: string;
  usedRag: boolean;
};
