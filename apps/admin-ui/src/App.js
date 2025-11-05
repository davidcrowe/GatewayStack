import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
export default function App() {
    const [health, setHealth] = useState(null);
    useEffect(() => {
        fetch("/health").then(r => r.json()).then(setHealth).catch(() => setHealth({ ok: false }));
    }, []);
    return (_jsxs("div", { style: { fontFamily: "ui-sans-serif, system-ui", padding: 24 }, children: [_jsx("h1", { children: "Gateway Admin" }), _jsx("p", { children: "Server health:" }), _jsx("pre", { style: { background: "#f7f7f8", padding: 12, borderRadius: 8 }, children: JSON.stringify(health, null, 2) })] }));
}
