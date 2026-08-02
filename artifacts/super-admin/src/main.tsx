import { createRoot } from "react-dom/client";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
if (apiBase) setBaseUrl(apiBase);

setAuthTokenGetter(() => sessionStorage.getItem("wmh_super_token"));

createRoot(document.getElementById("root")!).render(<App />);
