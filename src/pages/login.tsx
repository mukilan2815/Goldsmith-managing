import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

const LOGIN_ID = "SG";
const LOGIN_PASS = "7007";

const Login: React.FC = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, redirect to dashboard
    if (localStorage.getItem("isLoggedIn") === "true") {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId === LOGIN_ID && password === LOGIN_PASS) {
      localStorage.setItem("isLoggedIn", "true");
      setError("");
      navigate("/");
    } else {
      setError("Invalid ID or password");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded shadow-md border">
        <div className="flex justify-between items-center mb-6">
          <Logo size="md" />
          <ThemeToggle />
        </div>
        <h1 className="text-2xl font-serif font-bold mb-2 text-center">
          Goldsmith Login
        </h1>
        <p className="text-muted-foreground text-center mb-6">
          Sign in to your account
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium">User ID</label>
            <Input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter ID"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              required
            />
          </div>
          {error && (
            <div className="text-red-500 mb-4 text-center">{error}</div>
          )}
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
