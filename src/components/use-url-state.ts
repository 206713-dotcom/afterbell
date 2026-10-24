"use client";
import { useCallback, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

const CHANGE = "afterbell:url-state";
const snapshot = () => window.location.search.slice(1);
function subscribe(listener: () => void) {
  window.addEventListener(CHANGE, listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener(CHANGE, listener);
    window.removeEventListener("popstate", listener);
  };
}

/** Native history keeps typing responsive and supports reload/back/forward. */
export function useUrlState() {
  const route = useSearchParams();
  const search = useSyncExternalStore(subscribe, snapshot, () =>
    route.toString(),
  );
  const update = useCallback(
    (
      patch: Record<string, string | null>,
      mode: "replace" | "push" = "replace",
    ) => {
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const url = `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`;
      if (
        url ===
        `${window.location.pathname}${window.location.search}${window.location.hash}`
      )
        return;
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
      window.dispatchEvent(new Event(CHANGE));
    },
    [],
  );
  return { params: new URLSearchParams(search), update };
}
