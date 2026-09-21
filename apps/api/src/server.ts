import { API_PORT } from "./infrastructure/config.js";
import { createApp } from "./interfaces/http/app.js";

const app = createApp();

app.listen(API_PORT, () => {
  console.log(`API listening on http://localhost:${API_PORT}`);
});
