export interface Citation {
  id: string;
  source: string;
}

export interface QueryResult {
  query: string;
  route: string;
  answer: string;
  citations: Citation[];
  toolTrace: string[];
  error?: string;
}

export interface IngestResult {
  files?: number;
  chunks?: number;
  error?: string;
}
