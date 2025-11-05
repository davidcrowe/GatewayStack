import { useEffect, useState } from "react";

export default function App() {
  const [health, setHealth] = useState<any>(null);
  useEffect(() => {
    fetch("/health").then(r => r.json()).then(setHealth).catch(() => setHealth({ ok: false }));
  }, []);

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24 }}>
      <h1>Gateway Admin</h1>
      <p>Server health:</p>
      <pre style={{ background: "#f7f7f8", padding: 12, borderRadius: 8 }}>
        {JSON.stringify(health, null, 2)}
      </pre>
    </div>
  );
}
