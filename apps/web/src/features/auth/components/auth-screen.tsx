"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

type AuthResponse = {
  user_id: string;
  email: string;
  handle: string;
  token: string;
  message: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function AuthScreen({ initialMode }: { initialMode: AuthMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showReset, setShowReset] = useState(false);
  const [phase, setPhase] = useState<"idle" | "exit" | "enter">("idle");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    handle: "",
    password: "",
    confirmPassword: ""
  });
  const [resetEmail, setResetEmail] = useState("");
  const timeoutRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const switchMode = (nextMode: AuthMode) => {
    if (nextMode === mode) return;

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    setNotice(null);
    setShowReset(false);
    setDirection(nextMode === "signup" ? "forward" : "backward");
    setPhase("exit");
    timeoutRef.current = window.setTimeout(() => {
      setMode(nextMode);
      setPhase("enter");
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = window.requestAnimationFrame(() => {
          setPhase("idle");
        });
      });
      router.replace(nextMode === "signup" ? `${pathname}?mode=signup` : pathname, {
        scroll: false
      });
    }, 160);
  };

  const handleAuthSuccess = (payload: AuthResponse) => {
    window.localStorage.setItem("statecode-auth", JSON.stringify(payload));
    setNotice({ type: "success", text: payload.message });
    router.push("/");
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      const payload = (await response.json()) as AuthResponse | { error?: string };

      if (!response.ok || !("token" in payload)) {
        setNotice({
          type: "error",
          text: "error" in payload && payload.error ? payload.error : "login failed"
        });
        return;
      }

      handleAuthSuccess(payload);
    } catch {
      setNotice({
        type: "error",
        text: "Could not reach the auth service. Start apps/api and apps/auth-rs."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (registerForm.password !== registerForm.confirmPassword) {
      setNotice({ type: "error", text: "Password confirmation does not match." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(registerForm)
      });

      const payload = (await response.json()) as AuthResponse | { error?: string };

      if (!response.ok || !("token" in payload)) {
        setNotice({
          type: "error",
          text: "error" in payload && payload.error ? payload.error : "registration failed"
        });
        return;
      }

      handleAuthSuccess(payload);
    } catch {
      setNotice({
        type: "error",
        text: "Could not reach the auth service. Start apps/api and apps/auth-rs."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async () => {
    setNotice(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/password-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: resetEmail
        })
      });

      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setNotice({
          type: "error",
          text: payload.error ?? "password reset request failed"
        });
        return;
      }

      setNotice({
        type: "success",
        text: payload.message ?? "Password reset request accepted."
      });
    } catch {
      setNotice({
        type: "error",
        text: "Could not reach the auth service. Start apps/api and apps/auth-rs."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10 md:px-8 lg:px-10">
      <section className="w-full max-w-md">
        <Card className="border bg-card">
          <CardHeader className="space-y-6">
            <div className="space-y-2 text-center">
              <CardTitle className="text-2xl">StateCode</CardTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "login"
                  ? "Enter your credentials to continue."
                  : "Create an account to start using StateCode."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "login" ? "secondary" : "ghost"}
                onClick={() => switchMode("login")}
              >
                Log in
              </Button>
              <Button
                type="button"
                variant={mode === "signup" ? "secondary" : "ghost"}
                onClick={() => switchMode("signup")}
              >
                Sign up
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {notice ? (
              <div
                className={cn(
                  "border px-3 py-2 text-sm",
                  notice.type === "error"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-primary/30 bg-primary/10 text-foreground"
                )}
              >
                {notice.text}
              </div>
            ) : null}

            <div
              key={mode}
              className={cn(
                "space-y-5 transition-all duration-200 ease-out",
                phase === "idle" && "translate-x-0 opacity-100",
                phase === "exit" && direction === "forward" && "-translate-x-4 opacity-0",
                phase === "exit" && direction === "backward" && "translate-x-4 opacity-0",
                phase === "enter" && direction === "forward" && "translate-x-4 opacity-0",
                phase === "enter" && direction === "backward" && "-translate-x-4 opacity-0"
              )}
            >
              {mode === "login" ? (
                <form className="space-y-5" onSubmit={handleLoginSubmit}>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                    <p className="text-sm text-muted-foreground">
                      Log in to continue to your workspace.
                    </p>
                  </div>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Email</span>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Password</span>
                    <Input
                      type="password"
                      placeholder="********"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                    />
                  </label>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <label className="inline-flex items-center gap-2 text-muted-foreground">
                      <input
                        type="checkbox"
                        className="size-4 rounded border border-input bg-background accent-[var(--primary)]"
                      />
                      Remember me
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowReset((value) => !value)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Signing in..." : "Log in"}
                    <ArrowRight className="size-4" />
                  </Button>

                  <div
                    className={cn(
                      "overflow-hidden border bg-muted/40 transition-all duration-300",
                      showReset
                        ? "max-h-52 p-4 opacity-100"
                        : "max-h-0 border-transparent p-0 opacity-0"
                    )}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center border bg-background">
                          <KeyRound className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Reset password</div>
                          <div className="text-xs text-muted-foreground">
                            We will send a recovery link to your email.
                          </div>
                        </div>
                      </div>

                      <label className="space-y-2">
                        <span className="text-sm font-medium">Recovery email</span>
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          value={resetEmail}
                          onChange={(event) => setResetEmail(event.target.value)}
                        />
                      </label>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isSubmitting}
                        onClick={handleResetSubmit}
                      >
                        {isSubmitting ? "Sending..." : "Send recovery link"}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Don&apos;t have an account? Sign up
                  </button>
                </form>
              ) : (
                <form className="space-y-5" onSubmit={handleRegisterSubmit}>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
                    <p className="text-sm text-muted-foreground">
                      Register to start submitting and joining contests.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium">First name</span>
                      <Input
                        type="text"
                        placeholder="Amina"
                        value={registerForm.firstName}
                        onChange={(event) =>
                          setRegisterForm((current) => ({
                            ...current,
                            firstName: event.target.value
                          }))
                        }
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium">Last name</span>
                      <Input
                        type="text"
                        placeholder="Karimova"
                        value={registerForm.lastName}
                        onChange={(event) =>
                          setRegisterForm((current) => ({
                            ...current,
                            lastName: event.target.value
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Email</span>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={registerForm.email}
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          email: event.target.value
                        }))
                      }
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Handle</span>
                    <Input
                      type="text"
                      placeholder="stackrunner"
                      value={registerForm.handle}
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          handle: event.target.value
                        }))
                      }
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Password</span>
                    <Input
                      type="password"
                      placeholder="********"
                      value={registerForm.password}
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          password: event.target.value
                        }))
                      }
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Confirm password</span>
                    <Input
                      type="password"
                      placeholder="Repeat password"
                      value={registerForm.confirmPassword}
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          confirmPassword: event.target.value
                        }))
                      }
                    />
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="size-4 rounded border border-input bg-background accent-[var(--primary)]"
                    />
                    I agree to the platform rules
                  </label>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create account"}
                    <ArrowRight className="size-4" />
                  </Button>

                  <Separator />

                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Already have an account? Log in
                  </button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
