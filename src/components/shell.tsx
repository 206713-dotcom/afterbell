"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { motion, MotionConfig } from "framer-motion";
import {
  ArrowRight,
  Bell,
  Check,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "./store";
import { Button } from "./ui/button";
import { ErrorMessage, Modal } from "./shared";
import { browserClient } from "@/lib/supabase/client";
import { incomingFriendRequests } from "@/lib/social";
import { AccountStatus } from "./account-status";
import { clearChatDrafts } from "@/lib/chat-drafts";
import {
  Breadcrumbs,
  MobileNavigation,
  NavigationSearch,
  SidebarNavigation,
  useMobileNavigation,
} from "./app-navigation";

export function Shell({ children }: { children: ReactNode }) {
  const { state, demo, error, mutate } = useApp();
  const friendRequests = incomingFriendRequests(state).length;
  const mobile = useMobileNavigation();
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [search, setSearch] = useState(false);
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMenu(false);
        setNotifications(false);
        setSearch((value) => !value);
      }
    }
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  async function logout() {
    clearChatDrafts();
    await fetch("/api/demo", { method: "DELETE" });
    if (!demo) {
      await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      if (
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
        await browserClient().auth.signOut();
    }
    // Clear the previous identity's private route and component data.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {mobile ? (
        <Modal
          open={menu}
          onClose={() => setMenu(false)}
          title="Your space"
          id="navigation-menu"
          className="navigation-drawer"
        >
          <SidebarNavigation onNavigate={() => setMenu(false)} />
        </Modal>
      ) : (
        <aside className="sidebar">
          <SidebarNavigation onNavigate={() => setMenu(false)} />
        </aside>
      )}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-only"
              onClick={() => setMenu(true)}
              aria-label="Open menu"
              aria-expanded={menu}
              aria-controls="navigation-menu"
            >
              <Menu size={22} />
            </button>
            <Breadcrumbs />
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              aria-label="Search AfterBell"
              aria-haspopup="dialog"
              onClick={() => setSearch(true)}
            >
              <Search size={18} />
              <span>Find plans, places, people…</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Open notifications"
              onClick={() => setNotifications(true)}
            >
              <Bell size={20} />
              {(friendRequests > 0 ||
                state.notifications.some((n) => !n.read)) && <span />}
            </button>
            <Link
              href="/profile"
              className="avatar avatar-green"
              aria-label="Your profile"
            >
              {state.profile.name.slice(0, 1)}
            </Link>
          </div>
        </header>
        {demo ? (
          <div className="demo-strip">
            <span>
              <span className="status-dot" />
              <span className="demo-label">Demo Data</span>{" "}
              <span className="demo-strip-description">
                · Fictional people and plans. Your changes stay in this browser.
              </span>
            </span>
            <button onClick={() => void logout()}>
              Exit demo <LogOut size={12} />
            </button>
          </div>
        ) : (
          state.profile.id && (
            <div className="account-strip">
              <span>
                <ShieldCheck size={14} />
                {state.profile.name} ·{" "}
                {state.accountMode === "local"
                  ? "Account saved on this server"
                  : "Your account"}
              </span>
              <button onClick={() => void logout()}>
                Sign out <LogOut size={13} />
              </button>
            </div>
          )
        )}
        <MotionConfig reducedMotion="user">
          <motion.main
            id="main-content"
            className="page-content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ErrorMessage message={error} />
            <AccountStatus>{children}</AccountStatus>
          </motion.main>
        </MotionConfig>
        <footer className="app-footer">
          <span>Make time for the things you love.</span>
          <Link href="/settings">
            <ShieldCheck size={13} />
            Privacy & community care
          </Link>
          <Link href="/">About AfterBell</Link>
        </footer>
      </div>
      {mobile && <MobileNavigation />}
      <NavigationSearch open={search} onClose={() => setSearch(false)} />
      <Modal
        open={notifications}
        onClose={() => setNotifications(false)}
        title="Your updates"
      >
        <div className="notification-list">
          {friendRequests > 0 && (
            <div className="notification-friend-requests">
              <span className="notification-icon">
                <Bell size={17} />
              </span>
              <p>
                <b>
                  {friendRequests} friend{" "}
                  {friendRequests === 1 ? "request is" : "requests are"}{" "}
                  waiting.
                </b>
                <Link
                  className="text-link"
                  href="/connections?view=requests"
                  onClick={() => setNotifications(false)}
                >
                  Review requests <ArrowRight size={12} />
                </Link>
              </p>
              <span className="status-dot" />
            </div>
          )}
          {state.notifications.length
            ? state.notifications.map((n) => (
                <div key={n.id}>
                  <span className="notification-icon">
                    <Bell size={17} />
                  </span>
                  <p>
                    {n.text}
                    {n.href && (
                      <Link
                        className="text-link"
                        href={n.href}
                        onClick={() => setNotifications(false)}
                      >
                        View details <ArrowRight size={12} />
                      </Link>
                    )}
                  </p>
                  {!n.read && <span className="status-dot" />}
                </div>
              ))
            : !friendRequests && (
                <p>You’re all caught up. New invitations will appear here.</p>
              )}
        </div>
        <Button
          variant="outline"
          disabled={!state.notifications.some((n) => !n.read)}
          onClick={() => {
            void mutate("readNotifications").catch(() => {});
            setNotifications(false);
          }}
        >
          <Check size={16} />
          Mark all as read
        </Button>
      </Modal>
    </div>
  );
}
