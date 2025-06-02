import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className = "" }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl md:text-2xl",
    md: "text-2xl md:text-3xl",
    lg: "text-3xl md:text-4xl",
  };

  return (
    <div className={`flex items-center ${className}`}>
    </div>
  );
}

export function LogoIcon() {
  return (
    <div className="h-8 w-8 rounded-full bg-gold flex items-center justify-center shadow-lg">
      <span className="text-white text-lg font-serif font-bold">G</span>
    </div>
  );
}
