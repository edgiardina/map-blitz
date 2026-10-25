import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ?tv=1 turns off GPU-heavy effects for weak TV devices (see html.tv in index.css).
if (new URLSearchParams(window.location.search).has("tv")) {
  document.documentElement.classList.add("tv");
}

createRoot(document.getElementById("root")!).render(<App />);
