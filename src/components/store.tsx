"use client";
/* eslint-disable react-hooks/set-state-in-effect -- local storage hydration and authenticated API synchronization */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { demoState } from "@/lib/fixtures";
import { upgradeDemoCommunities } from "@/lib/community-fixtures";
import { upgradeDemoSocial } from "@/lib/social-fixtures";
import { applyDemo, type Operation } from "@/lib/actions";
export { applyDemo } from "@/lib/actions";
export type { Operation } from "@/lib/actions";
import type { AppState } from "@/lib/types";
import {
  clearChatDrafts,
  draftStorage,
  pruneChatDrafts,
} from "@/lib/chat-drafts";
const KEY = "afterbell-demo-v1";
type Store = {
  state: AppState;
  demo: boolean;
  loading: boolean;
  error: string;
  notice: string;
  loadError: string;
  refreshing: boolean;
  sessionExpired: boolean;
  mutate: (
    op: Operation,
    payload?: Record<string, unknown>,
  ) => Promise<unknown>;
  notify: (message: string) => void;
  refresh: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
function emptyState(): AppState {
  return {
    profile: {
      id: "",
      name: "Your neighbour",
      city: "Petaling Jaya",
      age: "adult",
      interests: [],
      subjects: [],
      availability: [],
      communityTypes: [],
      experience: "Beginner",
      discoverable: false,
      onboarded: false,
    },
    hubs: [],
    sparks: [],
    candidates: [],
    nearbyPeople: [],
    nearbySettings: { areaId: null, bio: "", visible: false },
    proposals: [],
    notifications: [],
    joined: [],
    saved: [],
    reports: [],
    blocked: [],
    hubMembers: [],
    memberships: [],
    hubInvites: [],
  };
}
export function AppProvider({
  children,
  demo,
}: {
  children: ReactNode;
  demo: boolean;
}) {
  const [state, setState] = useState<AppState>(() =>
    demo
      ? upgradeDemoSocial(upgradeDemoCommunities(demoState()))
      : emptyState(),
  );
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const latest = useRef(state);
  const version = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const mutating = useRef(0);
  const lastRead = useRef(0);
  const commit = useCallback(
    (next: AppState) => {
      pruneChatDrafts(draftStorage(), next, demo);
      latest.current = next;
      setState(next);
    },
    [demo],
  );
  const pathname = usePathname();
  const readState = useCallback(
    (force = false): Promise<void> => {
      if (demo || (!force && mutating.current > 0)) return Promise.resolve();
      if (inFlight.current && !force) return inFlight.current;
      const requestVersion = ++version.current;
      lastRead.current = Date.now();
      setRefreshing(true);
      const operation = (async () => {
        let expired = false;
        try {
          const response = await fetch("/api/state", { cache: "no-store" });
          expired = response.status === 401;
          const data = await response.json();
          if (!response.ok)
            throw new Error(
              data.error ?? "Your account could not be loaded. Try again.",
            );
          if (!data.profile?.id)
            throw new Error(
              "Your account returned an incomplete response. Try again.",
            );
          if (requestVersion === version.current) {
            commit(data);
            setLoadError("");
            setSessionExpired(false);
          }
        } catch (e) {
          if (requestVersion === version.current) {
            if (expired) {
              clearChatDrafts();
              commit(emptyState());
            }
            setSessionExpired(expired);
            setLoadError(
              expired
                ? "Your session has ended. Sign in again to continue."
                : e instanceof TypeError
                  ? "We couldn’t reach your account. Check your connection and try again."
                  : e instanceof Error
                    ? e.message
                    : "Your account could not be loaded. Try again.",
            );
          }
          throw e;
        } finally {
          if (requestVersion === version.current) {
            setRefreshing(false);
            setLoading(false);
          }
        }
      })();
      inFlight.current = operation;
      void operation
        .finally(() => {
          if (inFlight.current === operation) {
            inFlight.current = null;
            if (mutating.current === 0) setRefreshing(false);
          }
        })
        .catch(() => {});
      return operation;
    },
    [demo, commit],
  );
  const refresh = useCallback(() => readState(), [readState]);
  useEffect(() => {
    setError("");
    if (demo) {
      try {
        const cached = localStorage.getItem(KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as AppState;
          if (parsed.profile?.id === "demo-you" && Array.isArray(parsed.sparks))
            commit(
              upgradeDemoSocial(
                upgradeDemoCommunities({ ...demoState(), ...parsed }),
              ),
            );
        }
      } catch {
        setError("Saved demo data could not be read. Reset it in Settings.");
      }
      setLoading(false);
      return;
    }
    if (pathname === "/" || pathname === "/auth") {
      setLoadError("");
      setLoading(false);
      return;
    }
    if (!latest.current.profile.id) setLoading(true);
    void readState().catch(() => {});
  }, [demo, pathname, commit, readState]);
  useEffect(() => {
    if (demo || pathname === "/" || pathname === "/auth") return;
    const update = () => {
      if (!document.hidden && Date.now() - lastRead.current > 1500)
        void readState().catch(() => {});
    };
    const timer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [demo, pathname, readState]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const mutate = useCallback(
    async (op: Operation, payload: Record<string, unknown> = {}) => {
      setError("");
      try {
        if (demo) {
          if (op === "reset") clearChatDrafts();
          const next =
            op === "reset"
              ? upgradeDemoSocial(upgradeDemoCommunities(demoState()))
              : applyDemo(latest.current, op, payload);
          localStorage.setItem(KEY, JSON.stringify(next));
          commit(next);
          return next;
        }
        mutating.current++;
        version.current++;
        const response = await fetch(
          op === "communityManage" ? `/api/hubs/${payload.id}` : "/api/mutate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              op === "communityManage" ? payload : { op, payload },
            ),
          },
        );
        const result = await response.json();
        if (response.status === 401) {
          clearChatDrafts();
          commit(emptyState());
          setSessionExpired(true);
          setLoadError("Your session has ended. Sign in again to continue.");
        }
        if (!response.ok)
          throw new Error(result.error ?? "That change could not be saved.");
        try {
          await readState(true);
        } catch {
          throw new Error(
            "Saved, but refresh failed. Reload to see your latest data.",
          );
        }
        return result;
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : "Something went wrong. Please try again.";
        setError(message);
        throw new Error(message);
      } finally {
        if (!demo) {
          mutating.current = Math.max(0, mutating.current - 1);
          if (!inFlight.current) setRefreshing(false);
        }
      }
    },
    [demo, commit, readState],
  );
  return (
    <Context.Provider
      value={{
        state,
        demo,
        loading,
        error,
        notice,
        mutate,
        notify: setNotice,
        refresh,
        loadError,
        refreshing,
        sessionExpired,
      }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </Context.Provider>
  );
}
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error("AppProvider missing");
  return context;
}
