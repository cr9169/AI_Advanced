import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { errorMessage, ingestKnowledge, queryAgent } from "./api";
import { API_URL, DEFAULT_QUERY } from "./shared/constants";
import type { QueryResult } from "./shared/types";

function fileLabel(source: string): string {
  const normalized = source.replaceAll("\\", "/");
  const parts = normalized.split("/");
  return parts.at(-1) || source;
}

function toolParts(item: string): { name: string; detail: string } {
  const space = item.indexOf(" ");
  if (space === -1) {
    return { name: item, detail: "" };
  }
  const name = item.slice(0, space);
  const rest = item.slice(space + 1);
  try {
    const parsed = JSON.parse(rest) as Record<string, unknown>;
    return { name, detail: Object.values(parsed).map(String).join(" · ") };
  } catch {
    return { name, detail: rest };
  }
}

function renderAnswer(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, index) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) {
      return <strong key={index}>{bold[1]}</strong>;
    }
    const cite = /^\[(\d+)\]$/.exec(part);
    if (cite) {
      return (
        <sup key={index} className="cite">
          [{cite[1]}]
        </sup>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export default function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<QueryResult | undefined>();
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"ok" | "err" | "busy" | "">("");

  async function send(): Promise<void> {
    const next = query.trim();
    if (next === "") {
      setStatus("Write a question first.");
      setStatusKind("err");
      return;
    }
    setBusy(true);
    setStatus("Asking the corpus…");
    setStatusKind("busy");
    try {
      const response = await queryAgent(next);
      if (!response.ok) {
        setStatus(response.data.error ?? `HTTP ${response.status}`);
        setStatusKind("err");
        setResult(undefined);
        return;
      }
      setResult(response.data);
      setStatus("");
      setStatusKind("");
    } catch (error: unknown) {
      setStatus(errorMessage(error));
      setStatusKind("err");
    } finally {
      setBusy(false);
    }
  }

  async function ingest(): Promise<void> {
    setBusy(true);
    setStatus("Ingesting knowledge files…");
    setStatusKind("busy");
    try {
      const response = await ingestKnowledge();
      if (!response.ok) {
        setStatus(response.data.error ?? `HTTP ${response.status}`);
        setStatusKind("err");
        return;
      }
      setStatus(
        `Ingested ${response.data.chunks ?? 0} chunks from ${response.data.files ?? 0} files.`,
      );
      setStatusKind("ok");
    } catch (error: unknown) {
      setStatus(errorMessage(error));
      setStatusKind("err");
    } finally {
      setBusy(false);
    }
  }

  function onAsk(event: FormEvent): void {
    event.preventDefault();
    void send();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <main className="page">
      <header className="masthead">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <h1>Knowledge agent</h1>
            <p className="hint">Ask the local corpus. Answers stay grounded in your files.</p>
          </div>
        </div>
        <span className="api-chip">{API_URL}</span>
      </header>

      <form className="composer" onSubmit={onAsk}>
        <label htmlFor="query">Question</label>
        <textarea
          id="query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          rows={4}
          disabled={busy}
          placeholder="Ask how routing, RAG, Bedrock, or MCP works…"
        />
        <div className="row">
          <button className="primary" type="submit" disabled={busy}>
            {busy && statusKind === "busy" && status.startsWith("Asking")
              ? "Asking…"
              : "Ask"}
          </button>
          <button
            className="ghost"
            type="button"
            disabled={busy}
            onClick={() => void ingest()}
          >
            Ingest
          </button>
          <span className="kbd">Ctrl + Enter</span>
        </div>
      </form>

      {status ? <p className={`status ${statusKind}`}>{status}</p> : null}

      {result ? (
        <section className="result">
          <div className="result-head">
            <span className={`badge ${result.route}`}>{result.route}</span>
            <span className="asked">{result.query || query}</span>
          </div>
          <div className="result-grid">
            <article className="answer">{renderAnswer(result.answer)}</article>
            <aside className="side">
              <h2>Citations</h2>
              {result.citations.length === 0 ? (
                <p className="muted">None for this route.</p>
              ) : (
                <ul className="citations">
                  {result.citations.map((citation) => (
                    <li key={citation.id} title={citation.source}>
                      <span className="file">{fileLabel(citation.source)}</span>
                      <span className="id">{citation.id}</span>
                    </li>
                  ))}
                </ul>
              )}
              {result.toolTrace.length > 0 ? (
                <>
                  <h2 className="trace-title">Tool trace</h2>
                  <ul className="trace">
                    {result.toolTrace.map((item) => {
                      const tool = toolParts(item);
                      return (
                        <li key={item}>
                          <span className="name">{tool.name}</span>
                          {tool.detail ? (
                            <span className="detail">{tool.detail}</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}
            </aside>
          </div>
        </section>
      ) : (
        <section className="empty">
          <h2>Ready when you are</h2>
          <p>Ask a technical question to retrieve chunks, or ingest after you change files.</p>
        </section>
      )}
    </main>
  );
}
