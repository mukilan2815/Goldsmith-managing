import axios from "axios";
import { toast } from "@/hooks/use-toast";

// For local development, this would point to your local server
export const API_URL = "https://backend-goldsmith.onrender.com/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Increasing timeout for slower connections
  timeout: 30000, // 30 seconds
});

// Add interceptors for better error handling and loading states
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error Details:", {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
    });

    let errorMessage =
      "Connection to server failed. Please check your backend is running.";

    if (error.response) {
      // The request was made and the server responded with a status code
      errorMessage =
        error.response.data?.message ||
        `Server error: ${error.response.status}`;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage =
        "No response from server. Please check if your backend server is running.";
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = `Request error: ${error.message}`;
    }

    toast({
      variant: "destructive",
      title: "Error",
      description: errorMessage,
    });

    return Promise.reject(error);
  }
);
