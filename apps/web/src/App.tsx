import { useState } from "react";
import { errorMessage, ingestKnowledge, queryAgent } from "./api";
import { API_URL, DEFAULT_QUERY } from "./shared/constants";
import type { QueryResult } from "./shared/types";

export default function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<QueryResult | undefined>();
  const [status, setStatus] = useState("");

  async function send(): Promise<void> {
    setBusy(true);
    setStatus("");
    try {
      const response = await queryAgent(query);
      if (!response.ok) {
        setStatus(response.data.error ?? `HTTP ${response.status}`);
        setResult(undefined);
        return;
      }
      setResult(response.data);
    } catch (error: unknown) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function ingest(): Promise<void> {
    setBusy(true);
    setStatus("Ingesting...");
    try {
      const response = await ingestKnowledge();
      if (!response.ok) {
        setStatus(response.data.error ?? `HTTP ${response.status}`);
        return;
      }
      setStatus(
        `Ingested ${response.data.chunks ?? 0} chunks from ${response.data.files ?? 0} files.`,
      );
    } catch (error: unknown) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <h1>Knowledge agent</h1>
      <p className="hint">Local UI only. API at {API_URL}</p>
      <textarea
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        rows={4}
      />
      <div className="row">
        <button type="button" disabled={busy} onClick={() => void send()}>
          Ask
        </button>
        <button type="button" disabled={busy} onClick={() => void ingest()}>
          Ingest
        </button>
      </div>
      {status ? <p className="status">{status}</p> : null}
      {result ? (
        <section className="result">
          <p>
            <strong>route:</strong> {result.route}
          </p>
          <pre className="answer">{result.answer}</pre>
          <h2>Citations</h2>
          {result.citations.length === 0 ? (
            <p>None</p>
          ) : (
            <ul>
              {result.citations.map((citation) => (
                <li key={citation.id}>
                  {citation.source} ({citation.id})
                </li>
              ))}
            </ul>
          )}
          {result.toolTrace.length > 0 ? (
            <>
              <h2>Tool trace</h2>
              <ul>
                {result.toolTrace.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
