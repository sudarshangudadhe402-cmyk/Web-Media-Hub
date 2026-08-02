import { createRoot } from "react-dom/client";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// When VITE_API_BASE_URL is set (e.g. on Vercel pointing to Railway/Render),
// all generated API hooks will use it as the base. Locally it is empty so
// relative /api/... paths are used as before (proxied by Vite dev server).
const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
if (apiBase) setBaseUrl(apiBase);

setAuthTokenGetter(() => localStorage.getItem("wmh_token"));

createRoot(document.getElementById("root")!).render(<App />);
