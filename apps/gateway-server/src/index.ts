import "dotenv/config";

import { buildApp } from "./app";

const app = buildApp(process.env);
const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`[gateway-server] listening on :${port}`));
