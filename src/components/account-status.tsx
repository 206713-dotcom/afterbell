"use client";
import Link from "next/link";
import { type ReactNode } from "react";
import { LogIn, RefreshCw, WifiOff } from "lucide-react";
import { useApp } from "./store";
import { Button } from "./ui/button";

export function AccountStatus({
  children,
  standalone = false,
}: {
  children: ReactNode;
  standalone?: boolean;
}) {
  const { state, loadError, refresh, refreshing, sessionExpired, demo } =
    useApp();
  if (demo || !loadError) return children;
  const retry = () => void refresh().catch(() => {});
  if (state.profile.id && !sessionExpired)
    return (
      <>
        <div className="account-update-banner" role="status">
          <WifiOff size={18} />
          <div>
            <b>Updates are paused.</b>
            <p>You’re seeing your last loaded data. {loadError}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={refreshing}
            onClick={retry}
          >
            <RefreshCw size={14} />
            {refreshing ? "Trying…" : "Retry updates"}
          </Button>
        </div>
        {children}
      </>
    );
  const content = (
    <section
      className="account-recovery"
      role="alert"
      aria-labelledby="account-recovery-title"
    >
      <span className="account-recovery-icon">
        {sessionExpired ? <LogIn size={27} /> : <WifiOff size={27} />}
      </span>
      <span className="eyebrow">Let’s get you back to your plans</span>
      <h1 id="account-recovery-title">
        {sessionExpired
          ? "Sign in to continue."
          : "Your account couldn’t load."}
      </h1>
      <p>{loadError}</p>
      <div className="account-recovery-actions">
        {!sessionExpired && (
          <Button
            type="button"
            variant="secondary"
            disabled={refreshing}
            onClick={retry}
          >
            <RefreshCw size={16} />
            {refreshing ? "Trying again…" : "Try again"}
          </Button>
        )}
        <Button asChild variant={sessionExpired ? "secondary" : "outline"}>
          <Link href="/auth">
            {sessionExpired ? "Sign in again" : "Back to sign in"}
            <LogIn size={16} />
          </Link>
        </Button>
      </div>
    </section>
  );
  return standalone ? (
    <main className="account-recovery-page">{content}</main>
  ) : (
    content
  );
}
