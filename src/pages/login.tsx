
import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { Logo } from "@/components/logo";

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side with background image - Decorative panel */}
      <div className="hidden md:flex md:w-1/2 bg-[url('https://images.unsplash.com/photo-1618001789159-ffffe6f96ef2?q=80&w=1287&auto=format&fit=crop')] bg-cover bg-center">
        <div className="w-full h-full bg-black/30 flex flex-col justify-between p-10">
          <div>
            <Logo size="lg" className="text-white" />
          </div>
          <div className="max-w-md">
            <h2 className="text-white font-serif text-3xl mb-4">
              Goldsmith Business Management System
            </h2>
            <p className="text-white/80">
              Precision tools for professionals in the jewelry industry.
              Track inventory, manage clients, and streamline your goldsmith business.
            </p>
          </div>
        </div>
      </div>

      {/* Right side with login form */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center p-6">
          <div className="md:hidden">
            <Logo size="md" />
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-serif font-bold mb-2">
                Welcome to GoldCraft
              </h1>
              <p className="text-muted-foreground">
                Sign in to your account or create a new one
              </p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm />
                <p className="text-center text-sm text-muted-foreground mt-6">
                  Don't have an account?{" "}
                  <Link
                    to="#"
                    className="text-gold hover:text-gold-dark underline underline-offset-4"
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.querySelector('[data-value="signup"]');
                      if (element instanceof HTMLElement) {
                        element.click();
                      }
                    }}
                  >
                    Sign up
                  </Link>
                </p>
              </TabsContent>
              <TabsContent value="signup">
                <SignupForm />
                <p className="text-center text-sm text-muted-foreground mt-6">
                  Already have an account?{" "}
                  <Link
                    to="#"
                    className="text-gold hover:text-gold-dark underline underline-offset-4"
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.querySelector('[data-value="login"]');
                      if (element instanceof HTMLElement) {
                        element.click();
                      }
                    }}
                  >
                    Sign in
                  </Link>
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
