import express from "express";
import bodyParser from "body-parser";
import { forwardRouter } from "./forwardToGateway";

const app = express();
app.use(bodyParser.json());

// Mount under /apps (so /apps/tools/list, /apps/tools/create)
app.use("/apps", forwardRouter());

const port = Number(process.env.PORT ?? 5052);
app.listen(port, () => console.log(`[apps-sdk-demo] running on :${port}`));
