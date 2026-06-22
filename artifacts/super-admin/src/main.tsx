import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

setAuthTokenGetter(() => sessionStorage.getItem("wmh_super_token"));

createRoot(document.getElementById("root")!).render(<App />);
