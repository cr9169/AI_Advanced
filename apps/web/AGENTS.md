# apps/web

Vite + React on port 5173. Talks to the local Express API (`VITE_API_URL`, default `http://localhost:8787`).

No router, no auth UI. Shared DTOs and URL constants live in `src/shared`. Fetch helpers and `errorMessage` live in `src/api.ts` — do not add a one-function `utils.ts`.
