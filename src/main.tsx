import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App.tsx";
import "./index.css";

// 1. Better DOM query with a safety fallback check
const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error(
        "Failed to find the root element. Ensure there is a <div id='root'></div> in your index.html."
    );
}

// 2. Wrap App in StrictMode for better development safety
createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>
);
