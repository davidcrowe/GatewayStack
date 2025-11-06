import express from "express";
import bodyParser from "body-parser";
import { jwksRouter } from "./jwks";
import { mintRouter } from "./mintToken";
import { prmRouter } from "./prm";
import { forwardRouter } from "./forwardToGateway";

const app = express();
app.use(bodyParser.json());

app.use(jwksRouter());     // /.well-known/jwks.json
app.use(prmRouter());      // /.well-known/oauth-protected-resource
app.use(mintRouter());     // /mint
app.use("/mcp", forwardRouter());

const port = Number(process.env.PORT ?? 5051);
app.listen(port, () => console.log(`[mcp-demo] running on :${port}`));
