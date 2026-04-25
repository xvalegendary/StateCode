"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuthPayload } from "@/features/auth/lib/session";
import { persistAuthSession } from "@/features/auth/lib/session";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

type AuthResponse = AuthPayload;

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
  const [loginValue, setLoginValue] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerForm, setRegisterForm] = useState({
    login: "",
    username: "",
    password: "",
    confirmPassword: ""
  });
  const [resetLogin, setResetLogin] = useState("");
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
    persistAuthSession(payload);
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
          login: loginValue,
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
        body: JSON.stringify({
          login: registerForm.login,
          username: registerForm.username,
          password: registerForm.password
        })
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
          login: resetLogin
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
      <section className="w-full max-w-[920px] border bg-background">
        <div className="grid min-h-[640px] md:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-between border-b p-6 md:border-b-0 md:border-r md:p-8">
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="inline-flex border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  StateCode access
                </div>
                <div className="space-y-3">
                  <h1 className="max-w-xs text-4xl font-semibold tracking-tight md:text-5xl">
                    Enter the judge without visual noise.
                  </h1>
                  <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                    Clean auth surface for login, registration, and account recovery. No filler,
                    just account access.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 md:p-10 lg:p-12">
            <div className="w-full max-w-[420px] space-y-6">
              <Card className="border-none bg-transparent shadow-none ring-0">
                <CardHeader className="space-y-5 px-0 pt-0">
                  <div className="grid grid-cols-2 gap-2 p-1">
                    <Button
                      type="button"
                      variant={mode === "login" ? "default" : "ghost"}
                      className="rounded-none"
                      onClick={() => switchMode("login")}
                    >
                      Login
                    </Button>
                    <Button
                      type="button"
                      variant={mode === "signup" ? "default" : "ghost"}
                      className="rounded-none"
                      onClick={() => switchMode("signup")}
                    >
                      Sign up
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <CardTitle className="text-2xl">
                      {mode === "login" ? "Login to StateCode" : "Create StateCode account"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {mode === "login"
                        ? "Use your login and password to continue."
                        : "Create a login, choose a @username, and start solving."}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 px-0 pb-0">
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
                        <div className="space-y-4">
                          <label className="space-y-2">
                            <span className="text-sm font-medium">Login</span>
                            <Input
                              type="text"
                              placeholder="statecode_login"
                              value={loginValue}
                              onChange={(event) => setLoginValue(event.target.value)}
                              className="rounded-none"
                            />
                          </label>

                          <label className="space-y-2">
                            <span className="text-sm font-medium">Password</span>
                            <Input
                              type="password"
                              placeholder="********"
                              value={loginPassword}
                              onChange={(event) => setLoginPassword(event.target.value)}
                              className="rounded-none"
                            />
                          </label>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-sm">
                          <label className="inline-flex items-center gap-2 text-muted-foreground">
                            <input
                              type="checkbox"
                              className="size-4 border border-input bg-background accent-[var(--primary)]"
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

                        <Button
                          type="submit"
                          className="w-full rounded-none"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Signing in..." : "Login"}
                          <ArrowRight className="size-4" />
                        </Button>

                        <div
                          className={cn(
                            "overflow-hidden border transition-all duration-300",
                            showReset
                              ? "max-h-56 px-4 py-4 opacity-100"
                              : "max-h-0 border-transparent px-4 py-0 opacity-0"
                          )}
                        >
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 items-center justify-center border">
                                <KeyRound className="size-4 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="text-sm font-medium">Password recovery</div>
                                <div className="text-xs text-muted-foreground">
                                  Send reset instructions by account login.
                                </div>
                              </div>
                            </div>

                            <label className="space-y-2">
                              <span className="text-sm font-medium">Account login</span>
                              <Input
                                type="text"
                                placeholder="statecode_login"
                                value={resetLogin}
                                onChange={(event) => setResetLogin(event.target.value)}
                                className="rounded-none"
                              />
                            </label>

                            <Button
                              type="button"
                              variant="outline"
                              className="w-full rounded-none"
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
                          Need an account? Switch to sign up
                        </button>
                      </form>
                    ) : (
                      <form className="space-y-5" onSubmit={handleRegisterSubmit}>
                        <div className="grid gap-4">
                          <label className="space-y-2">
                            <span className="text-sm font-medium">Login</span>
                            <Input
                              type="text"
                              placeholder="statecode_login"
                              value={registerForm.login}
                              onChange={(event) =>
                                setRegisterForm((current) => ({
                                  ...current,
                                  login: event.target.value
                                }))
                              }
                              className="rounded-none"
                            />
                          </label>

                          <label className="space-y-2">
                            <span className="text-sm font-medium">Username</span>
                            <Input
                              type="text"
                              placeholder="@statecoder"
                              value={registerForm.username}
                              onChange={(event) =>
                                setRegisterForm((current) => ({
                                  ...current,
                                  username: event.target.value
                                }))
                              }
                              className="rounded-none"
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
                              className="rounded-none"
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
                              className="rounded-none"
                            />
                          </label>
                        </div>

                        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            className="size-4 border border-input bg-background accent-[var(--primary)]"
                          />
                          I agree to the platform rules
                        </label>

                        <Button
                          type="submit"
                          className="w-full rounded-none"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Creating..." : "Create account"}
                          <ArrowRight className="size-4" />
                        </Button>

                        <Separator />

                        <button
                          type="button"
                          onClick={() => switchMode("login")}
                          className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Already registered? Switch to login
                        </button>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
