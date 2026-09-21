export interface RetrievedChunk {
  id: string;
  source: string;
  content: string;
}

export interface KnowledgeStore {
  retrieve(query: string, k?: number): Promise<RetrievedChunk[]>;
}
