import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Function to apply dark mode based on system setting
const applyTheme = (isDark: boolean) => {
  document.documentElement.classList.toggle("dark", isDark);
};

// Initial theme load
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");
applyTheme(systemPrefersDark.matches);

// Listen for system theme changes and apply immediately
systemPrefersDark.addEventListener("change", (event) => {
  applyTheme(event.matches);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
