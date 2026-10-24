"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  ChartNoAxesCombined,
  Compass,
  Home,
  GraduationCap,
  MessageCircle,
  MapPin,
  Plus,
  Search,
  Settings,
  Users,
  UserRound,
  Zap,
} from "lucide-react";
import { useApp } from "./store";
import { Brand } from "./visuals";
import { Button } from "./ui/button";
import { Modal } from "./shared";
import { planHref } from "@/lib/plans";
import { incomingFriendRequests } from "@/lib/social";
import { workspaceSearch, placeHref } from "@/lib/workspace-search";
import { venueLocality } from "@/lib/venues";

export const mainLinks = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/plans", label: "My plans", icon: CalendarDays },
  { href: "/hubs", label: "Communities", icon: Users },
  { href: "/connections", label: "Friends", icon: MessageCircle },
];
const otherLinks = [
  {
    href: "/places",
    label: "Courts & study spaces",
    icon: MapPin,
    description: "Book badminton courts and find a study room",
  },
  {
    href: "/schools",
    label: "Your school",
    icon: GraduationCap,
    description: "Choose your school and open its common room",
  },
  {
    href: "/nearby",
    label: "Near you",
    icon: MapPin,
    description: "People and activities around your area",
  },
  {
    href: "/unlock",
    label: "UNLOCK Lab",
    icon: Zap,
    description: "Find the missing people, places and resources",
  },
  {
    href: "/impact",
    label: "Community impact",
    icon: ChartNoAxesCombined,
    description: "See what your communities make possible",
  },
];
export function isCurrent(path: string, href: string) {
  return (
    path === href ||
    path.startsWith(`${href}/`) ||
    (href === "/explore" &&
      path !== "/sparks/create" &&
      ["/study", "/tutoring", "/badminton", "/sparks"].some(
        (p) => path === p || path.startsWith(`${p}/`),
      )) ||
    (href === "/plans" && path.startsWith("/groups/"))
  );
}
function subscribeMobile(listener: () => void) {
  const media = window.matchMedia("(max-width: 760px)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
export function useMobileNavigation() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 760px)").matches,
    () => false,
  );
}

export function SidebarNavigation({ onNavigate }: { onNavigate: () => void }) {
  const { state, demo } = useApp();
  const path = usePathname();
  const router = useRouter();
  const requests = incomingFriendRequests(state).length;
  return (
    <>
      <div className="sidebar-brand">
        <Link
          href="/dashboard"
          aria-label="AfterBell home"
          onClick={onNavigate}
        >
          <Brand />
        </Link>
      </div>
      <Button asChild variant="secondary" className="nav-create">
        <Link href="/sparks/create" onClick={onNavigate}>
          <Plus size={18} />
          Create a Spark
        </Link>
      </Button>
      <nav aria-label="Main navigation" className="primary-navigation">
        {mainLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`nav-item ${isCurrent(path, href) ? "active" : ""}`}
            aria-current={isCurrent(path, href) ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{label}</span>
            {href === "/connections" && requests > 0 && (
              <span
                className="nav-request-count"
                aria-label={`${requests} pending friend ${requests === 1 ? "request" : "requests"}`}
              >
                {requests}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="sidebar-caption">Discover more</div>
      <nav aria-label="Discovery and tools">
        {otherLinks
          .filter(
            (item) => item.href !== "/nearby" || state.profile.age === "adult",
          )
          .map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`nav-item ${isCurrent(path, href) ? "active" : ""}`}
              aria-current={isCurrent(path, href) ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
        <Link
          href="/plans?view=saved"
          className="nav-item"
          onClick={onNavigate}
        >
          <Bookmark size={19} />
          <span>Saved activities</span>
          {state.saved.length > 0 && (
            <span className="nav-count">{state.saved.length}</span>
          )}
        </Link>
      </nav>
      <label className="workspace-switcher">
        <span>Jump to your community</span>
        <select
          className="input"
          aria-label="Switch community"
          value={state.hubs.find((h) => path === `/hubs/${h.id}`)?.id ?? ""}
          onChange={(e) => {
            onNavigate();
            router.push(e.target.value ? `/hubs/${e.target.value}` : "/hubs");
          }}
        >
          <option value="">Choose a community</option>
          {state.hubs
            .filter((h) => state.joined.includes(h.id))
            .map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
        </select>
      </label>
      <div className="sidebar-push" />
      <div className="sidebar-footer">
        <Link
          href="/settings"
          className={`nav-item ${path === "/settings" ? "active" : ""}`}
          aria-current={path === "/settings" ? "page" : undefined}
          onClick={onNavigate}
        >
          <Settings size={18} />
          Settings & privacy
        </Link>
        <Link href="/profile" className="profile-link" onClick={onNavigate}>
          <span className="avatar avatar-green">
            {state.profile.name.slice(0, 1)}
          </span>
          <span>
            <b>{state.profile.name}</b>
            <small>{demo ? "Demo profile" : "View your profile"}</small>
          </span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}

export function MobileNavigation() {
  const path = usePathname();
  return (
    <nav className="mobile-bottom-nav" aria-label="Quick navigation">
      {[
        ...mainLinks.slice(0, 2),
        { href: "/sparks/create", label: "Create", icon: Plus },
        ...mainLinks.slice(2, 4),
      ].map(({ href, label, icon: Icon }) => {
        const active =
          href === "/explore" && path === "/sparks/create"
            ? false
            : isCurrent(path, href);
        return (
          <Link
            key={href}
            href={href}
            className={`${active ? "active" : ""} ${href === "/sparks/create" ? "mobile-create" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span>
              <Icon size={21} />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Breadcrumbs() {
  const path = usePathname();
  const { state } = useApp();
  const [section, id, action] = path.split("/").slice(1);
  const spark = state.sparks.find((s) => s.id === id);
  const hub = state.hubs.find((h) => h.id === id);
  const root =
    section === "hubs"
      ? { href: "/hubs", label: "Communities" }
      : section === "groups"
        ? { href: "/plans", label: "My plans" }
        : section === "sparks"
          ? { href: "/explore", label: "Explore" }
          : section === "unlock"
            ? { href: "/unlock", label: "UNLOCK Lab" }
            : null;
  const title =
    id === "create"
      ? "Create a Spark"
      : section === "hubs" && id
        ? (hub?.name ?? "Community")
        : id
          ? `${spark?.title ?? "Activity"}${action === "edit" ? " · Edit" : ""}`
          : ([...mainLinks, ...otherLinks].find((l) => l.href === path)
              ?.label ??
            {
              profile: "Your profile",
              settings: "Settings & privacy",
              study: "Study circles",
              tutoring: "Peer tutoring",
              badminton: "Badminton",
            }[section] ??
            "Your space");
  return (
    <nav aria-label="Breadcrumb" className="app-breadcrumbs">
      {path !== "/dashboard" && (
        <>
          <Link href={root && id ? root.href : "/dashboard"}>
            {root && id ? root.label : "Home"}
          </Link>
          <span aria-hidden="true">/</span>
        </>
      )}
      <span aria-current="page" title={title}>
        {title}
      </span>
    </nav>
  );
}

export function NavigationSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { state } = useApp();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const term = query.trim().toLowerCase();
  const routes = [
    ...mainLinks.map((l) => ({
      ...l,
      description:
        l.href === "/plans"
          ? "Confirmed sessions, drafts and bookmarks"
          : l.href === "/hubs"
            ? "Your schools, clubs and communities"
            : l.href === "/explore"
              ? "Study, tutoring, badminton and more"
              : l.href === "/connections"
                ? "Friends, requests and private conversations"
                : "Your next steps and recommendations",
    })),
    ...otherLinks.filter(
      (l) => l.href !== "/nearby" || state.profile.age === "adult",
    ),
    ...(term
      ? [
          {
            href: "/plans?view=saved",
            label: "Saved activities",
            description: "Your bookmarks, ready for later",
            icon: Bookmark,
          },
          {
            href: "/sparks/create",
            label: "Create a Spark",
            description: "Start a new activity",
            icon: Plus,
          },
          {
            href: "/profile",
            label: "Your profile",
            description: "Your interests, availability and account",
            icon: UserRound,
          },
          {
            href: "/settings",
            label: "Settings & privacy",
            description: "Your preferences and community care",
            icon: Settings,
          },
          {
            href: "/study",
            label: "Study circles",
            description: "Find a study partner or group",
            icon: Compass,
          },
          {
            href: "/tutoring",
            label: "Peer tutoring",
            description: "Get help with a subject",
            icon: Users,
          },
          {
            href: "/badminton",
            label: "Badminton",
            description: "Find players and a game",
            icon: Compass,
          },
        ]
      : []),
  ].filter((l) => `${l.label} ${l.description}`.toLowerCase().includes(term));
  const { activities, hubs, places, friends } = workspaceSearch(state, query);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Where would you like to go?"
      className="navigation-search"
      initialFocusRef={searchRef}
    >
      <form
        className="navigation-search-input"
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
          router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <Search size={21} />
        <input
          ref={searchRef}
          aria-label="Search AfterBell"
          placeholder="Plans, courts, communities or friends…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" aria-label="Search all activities">
          <ArrowRight size={20} />
        </button>
      </form>
      <div className="navigation-search-results">
        {!term && (
          <p className="search-hint">
            Find a plan, court, study space, community or connection.
          </p>
        )}
        {!!activities.length && (
          <section aria-label="Matching activities">
            <h3>Activities</h3>
            {activities.map((s) => (
              <Link href={planHref(state, s)} key={s.id} onClick={onClose}>
                <CalendarDays size={18} />
                <span>
                  <b>{s.title}</b>
                  <small>
                    {s.status === "DRAFT"
                      ? "Your private draft"
                      : `${s.city} · ${s.category}`}
                  </small>
                </span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </section>
        )}
        {!!hubs.length && (
          <section aria-label="Matching communities">
            <h3>Communities</h3>
            {hubs.map((h) => (
              <Link href={`/hubs/${h.id}`} key={h.id} onClick={onClose}>
                <Users size={18} />
                <span>
                  <b>{h.name}</b>
                  <small>
                    {h.city}
                    {state.joined.includes(h.id) ? " · You’re a member" : ""}
                  </small>
                </span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </section>
        )}
        {!!places.length && (
          <section aria-label="Matching places">
            <h3>Courts & study spaces</h3>
            {places.map((v) => (
              <Link key={v.id} href={placeHref(v)} onClick={onClose}>
                <MapPin size={18} />
                <span>
                  <b>{v.name}</b>
                  <small>
                    {venueLocality(v)} ·{" "}
                    {v.kind === "badminton"
                      ? "Badminton centre"
                      : "Study space"}
                  </small>
                </span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </section>
        )}
        {!!friends.length && (
          <section aria-label="Matching connections">
            <h3>Your connections</h3>
            {friends.map((p) => (
              <Link key={p.connectionId} href={p.href} onClick={onClose}>
                <MessageCircle size={18} />
                <span>
                  <b>{p.name}</b>
                  <small>
                    {state.profile.age === "adult"
                      ? "Open your conversation"
                      : "Open shared school chat"}{" "}
                    · {p.city}
                  </small>
                </span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </section>
        )}
        {!!routes.length && (
          <section aria-label="Pages">
            <h3>{term ? "Pages" : "Quick links"}</h3>
            {routes.map(({ href, label, description, icon: Icon }) => (
              <Link href={href} key={href} onClick={onClose}>
                <Icon size={18} />
                <span>
                  <b>{label}</b>
                  <small>{description}</small>
                </span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </section>
        )}
        {term &&
          !activities.length &&
          !hubs.length &&
          !routes.length &&
          !places.length &&
          !friends.length && (
            <div className="search-no-results">
              <h3>No quick matches for “{query}”.</h3>
              <p>Try a different name, or press Enter to search Explore.</p>
            </div>
          )}
      </div>
      <div className="search-keyboard-hint">
        <span>
          <kbd>Tab</kbd> move through links
        </span>
        <span>
          <kbd>Esc</kbd> close
        </span>
      </div>
    </Modal>
  );
}
