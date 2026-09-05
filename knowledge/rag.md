# File RAG

This project answers questions from markdown files in `knowledge/`.

Ingest is deterministic TypeScript: load `.md` / `.txt`, split into overlapping chunks, attach `source` and `chunkId`. Embeddings use Amazon Titan Text Embeddings V2 (`amazon.titan-embed-text-v2:0`) on Bedrock. Vectors currently live in an in-memory store for local development; they are rebuilt on each `npm start`.

Retrieval returns the top chunks. The RAG node must answer only from those chunks and cite them as `[n]` matching the prompt ids. If a fact is not in the chunks, the model must say the files do not contain it.

Do not invent file paths. Citations must use the `source` metadata from retrieved chunks.
