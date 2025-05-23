import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// API configuration for the application
const config = {
  // Base API URL - will be replaced with your deployed backend URL
  apiUrl: import.meta.env.PROD
    ? "https://your-deployed-api.com/api"
    : "https://backend-goldsmith.onrender.com/api",

  // MongoDB Atlas URI - only used in backend
  mongodbUri: import.meta.env.MONGO_URI || "mongodb://localhost:27017/",
};

// Export for use in services
export { config };

// Add event listener for animation effects
document.addEventListener("DOMContentLoaded", () => {
  // Add staggered animation to elements with data-animate attribute
  const animatedElements = document.querySelectorAll("[data-animate]");

  animatedElements.forEach((el, index) => {
    setTimeout(() => {
      el.classList.add("animate-fade-in");
    }, index * 100); // 100ms stagger between animations
  });
});

createRoot(document.getElementById("root")!).render(<App />);
