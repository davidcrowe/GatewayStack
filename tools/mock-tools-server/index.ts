import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json({ limit: "1mb" }));

app.post("/generateDreamSummary", (req, res) => {
  res.json({ tool: "generateDreamSummary", ok: true, args: req.body ?? {}, demo: true });
});

app.post("/chatWithEmbeddingsv3", (req, res) => {
  res.json({ tool: "chatWithEmbeddingsv3", ok: true, args: req.body ?? {}, demo: true });
});

const PORT = process.env.MOCK_PORT || 9090;
app.listen(PORT, () => console.log(`[mock] tools listening on :${PORT}`));
