"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { browserClient } from "@/lib/supabase/client";
import { Brand } from "./visuals";
import { DemoButton } from "./landing";
import { Button } from "./ui/button";
import { ErrorMessage } from "./shared";
import { WelcomeArt } from "./welcome-art";
import { clearChatDrafts } from "@/lib/chat-drafts";
export function Auth({
  initialMode = "login",
  initialError = false,
  configured = false,
  local = false,
}: {
  initialMode?: string;
  initialError?: boolean;
  configured?: boolean;
  local?: boolean;
}) {
  const [mode, setMode] = useState(
      ["register", "reset", "update"].includes(initialMode)
        ? initialMode
        : "login",
    ),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(
      initialError
        ? "That verification link could not be used. Request a fresh one below."
        : "",
    ),
    [success, setSuccess] = useState(""),
    [recoveryKey, setRecoveryKey] = useState(""),
    [savedKey, setSavedKey] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [confirmation, setConfirmation] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      if (["register", "update"].includes(mode) && password !== confirmation)
        throw new Error("Your passwords do not match.");
      if (local) {
        const response = await fetch("/api/account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: mode === "reset" ? "recover" : mode,
            email: email.trim(),
            password,
            recoveryKey,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to sign in.");
        clearChatDrafts();
        if (result.recoveryKey) {
          setSavedKey(result.recoveryKey);
          setSuccess(
            "Your account is ready. Save your recovery key below before continuing.",
          );
          return;
        }
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/dashboard");
        return;
      }
      const supabase = browserClient();
      const redirect = `${window.location.origin}/auth/callback`;
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirect },
        });
        if (error) throw error;
        if (data.session) {
          clearChatDrafts();
          await fetch("/api/demo", { method: "DELETE" });
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/onboarding");
          return;
        }
        setSuccess(
          "Check your email to verify your account, then return here to log in.",
        );
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${redirect}?recovery=1`,
        });
        if (error) throw error;
        setSuccess(
          "If an account exists, a password reset link is on its way. Check your email.",
        );
      } else if (mode === "update") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setSuccess(
          "Your password has been updated. You can return to your neighbourhood.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await fetch("/api/demo", { method: "DELETE" });
        clearChatDrafts();
        // Full reload clears the previous identity's React and route caches.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/onboarding");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    try {
      const { error } = await browserClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <aside className="auth-story">
        <Link href="/" aria-label="AfterBell home">
          <Brand light />
        </Link>
        <div className="auth-story-content">
          <span className="eyebrow">Make time for what matters</span>
          <p className="auth-story-title">
            Your people.
            <br />
            <em>Your next plan.</em>
          </p>
          <p className="auth-story-description">
            Study together. Get a game going. Find the people who turn “we
            should” into a plan.
          </p>
          <WelcomeArt />
        </div>
        <div className="auth-story-footer">
          <span>Study circles · Badminton · School communities</span>
          <span className="auth-footer-mark" aria-hidden="true">
            a.
          </span>
        </div>
      </aside>
      <div className="auth-form-wrap">
        <div className="auth-form-nav">
          <Link
            href="/"
            className="auth-mobile-brand"
            aria-label="AfterBell home"
          >
            <Brand />
          </Link>
          <Link href="/" className="back-link">
            <ArrowLeft size={14} />
            About AfterBell
          </Link>
        </div>
        <header className="auth-form-heading">
          <span className="eyebrow">
            {["reset", "update"].includes(mode)
              ? "Your way back to AfterBell"
              : mode === "register"
                ? "Your community starts here"
                : "Your space, ready when you are"}
          </span>
          <h1>
            {mode === "register" ? (
              <>
                Find your <em>people.</em>
              </>
            ) : mode === "reset" ? (
              "Let's get you back in."
            ) : mode === "update" ? (
              "Choose a new password."
            ) : (
              <>
                Welcome <em>back.</em>
              </>
            )}
          </h1>
          <p>
            {mode === "register"
              ? "One account for your school community, study sessions and next game. Start with what you enjoy."
              : mode === "reset"
                ? local
                  ? "Use your email and recovery key to choose a new password."
                  : "Enter your email. We’ll send you a link to reset your password."
                : mode === "update"
                  ? "Use a unique password with at least 10 characters."
                  : "Pick up your plans, reconnect with friends and see what’s happening in your communities."}
          </p>
        </header>
        {["login", "register"].includes(mode) && (
          <div className="auth-tabs">
            <button
              className={mode === "login" ? "active" : ""}
              aria-pressed={mode === "login"}
              disabled={busy}
              onClick={() => {
                setMode("login");
                setError("");
                setSuccess("");
              }}
            >
              Log in
            </button>
            <button
              className={mode === "register" ? "active" : ""}
              aria-pressed={mode === "register"}
              disabled={busy}
              onClick={() => {
                setMode("register");
                setError("");
                setSuccess("");
              }}
            >
              Create an account
            </button>
          </div>
        )}
        <ErrorMessage message={error} />
        {savedKey && (
          <section
            className="recovery-card"
            aria-label="Save your recovery key"
          >
            <KeyRound size={22} />
            <h2>Save your way back in.</h2>
            <p>
              Save this key in a private place. You’ll need it to reset your
              password. This is the only time you’ll see it; a password reset
              creates a new key.
            </p>
            <code>{savedKey}</code>
            <Button
              variant="secondary"
              onClick={() => {
                // A new identity must not reuse the demo or previous account’s layout.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.assign("/onboarding");
              }}
            >
              I’ve saved my key. Continue <ArrowRight size={15} />
            </Button>
          </section>
        )}
        {success && (
          <div className="success-message" role="status">
            {success}
            {mode === "update" && (
              <Link className="text-link" href="/dashboard">
                Your neighbourhood <ArrowRight size={13} />
              </Link>
            )}
          </div>
        )}
        {!savedKey && (
          <form onSubmit={submit}>
            {mode !== "update" && (
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            )}
            {(mode !== "reset" || local) && (
              <div className="field">
                <label htmlFor="password">
                  {mode === "update" ? "New password" : "Password"}
                </label>
                <div className="password-field">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={10}
                    maxLength={128}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "login"
                        ? "Enter your password"
                        : "At least 10 characters"
                    }
                  />
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {mode !== "login" && (
                  <small>
                    Use a unique password with at least 10 characters.
                  </small>
                )}
              </div>
            )}
            {["register", "update"].includes(mode) && (
              <div className="field">
                <label htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </div>
            )}
            {local && mode === "reset" && (
              <div className="field">
                <label htmlFor="recovery-key">Recovery key</label>
                <input
                  id="recovery-key"
                  required
                  minLength={48}
                  maxLength={48}
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value.trim())}
                  autoComplete="off"
                />
                <small>
                  The 48-character key you saved when you created your account.
                </small>
              </div>
            )}
            {mode === "login" && (
              <button
                className="auth-small-link"
                type="button"
                onClick={() => {
                  setMode("reset");
                  setError("");
                }}
              >
                Forgot your password?
              </button>
            )}
            <Button
              variant="secondary"
              disabled={busy || (!configured && !local)}
            >
              {busy
                ? "Connecting…"
                : mode === "register"
                  ? "Create your account"
                  : mode === "reset"
                    ? local
                      ? "Reset password"
                      : "Send reset email"
                    : mode === "update"
                      ? "Update password"
                      : "Log in"}
              <ArrowRight size={15} />
            </Button>
          </form>
        )}
        {["reset", "update"].includes(mode) && (
          <button className="auth-small-link" onClick={() => setMode("login")}>
            Back to login
          </button>
        )}
        {configured &&
          process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true" && (
            <Button
              variant="outline"
              onClick={() => void google()}
              disabled={busy}
              className="spaced-top"
            >
              Continue with Google
            </Button>
          )}
        {local && (
          <div className="auth-config-note">
            <ShieldCheck size={17} aria-hidden="true" />
            <p>
              <b>Saved for next time.</b> Your profile and plans are saved here.
              Keep your recovery key safe—you’ll need it to reset your password.
            </p>
          </div>
        )}
        {!configured && !local && (
          <div className="auth-config-note">
            <b>You’re viewing a preview.</b> Account access isn’t enabled yet.
            Try the demo below—no sign-up needed.
          </div>
        )}
        {process.env.NEXT_PUBLIC_ENABLE_DEMO !== "false" && (
          <section
            className="auth-demo-panel"
            aria-labelledby="auth-demo-title"
          >
            <span className="eyebrow">Curious? Start here</span>
            <h2 id="auth-demo-title">Take a look around.</h2>
            <p>
              Explore fictional plans, school communities and matching tools. No
              account needed.
            </p>
            <DemoButton className="full-width" />
            <p className="auth-demo-note">
              A practice space. Changes stay in this browser.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
