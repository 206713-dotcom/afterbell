"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  ArrowRight,
  Bookmark,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  LayoutGrid,
  List,
  X,
} from "lucide-react";
import { useApp } from "./store";
import { ActivityCard, Empty, Loading, PageHeading } from "./shared";
import { CategoryTabs } from "./category-tabs";
import {
  accessibleSparks,
  discover,
  matchReasons,
  matchesWindow,
  type DiscoveryFilters,
} from "@/lib/discovery";
import { Button } from "./ui/button";
import { cities } from "@/lib/validation";
import type { Category } from "@/lib/types";
import { venues } from "@/lib/venues";
import { academicLevels } from "@/lib/communities";
const FILTER_EVENT = "afterbell:discovery-filters";
function subscribeToFilters(listener: () => void) {
  window.addEventListener(FILTER_EVENT, listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener(FILTER_EVENT, listener);
    window.removeEventListener("popstate", listener);
  };
}
const browserFilters = () => window.location.search.slice(1);
export function Explore({
  initialCategory = "all",
}: {
  initialCategory?: Category | "all";
  initialQuery?: string;
}) {
  const { state, loading } = useApp();
  const routeParams = useSearchParams();
  // Synchronous URL subscription keeps controlled inputs responsive while Next
  // processes its route transition, and also handles browser back/forward.
  const search = useSyncExternalStore(subscribeToFilters, browserFilters, () =>
    routeParams.toString(),
  );
  const params = new URLSearchParams(search);
  const selectedCategory = params.get("category");
  const category = (
    ["all", "badminton", "study", "tutoring", "community"].includes(
      selectedCategory ?? "",
    )
      ? selectedCategory
      : initialCategory
  ) as Category | "all";
  const query = params.get("q") ?? "";
  const city = cities.includes(params.get("city") as (typeof cities)[number])
    ? params.get("city")!
    : "all";
  const saved = params.get("saved") === "1";
  const time = (
    ["morning", "afternoon", "evening"].includes(params.get("time") ?? "")
      ? params.get("time")
      : "any"
  ) as DiscoveryFilters["time"];
  const sort = (
    ["soonest", "spaces"].includes(params.get("sort") ?? "")
      ? params.get("sort")
      : "recommended"
  ) as DiscoveryFilters["sort"];
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") ?? "")
    ? params.get("date")!
    : "";
  const needsPeople = params.get("spaces") === "1";
  const list = params.get("view") === "list";
  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all" || value === "any" || value === "recommended")
      next.delete(key);
    else next.set(key, value);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${next.size ? `?${next}` : ""}`,
    );
    window.dispatchEvent(new Event(FILTER_EVENT));
  }
  function reset() {
    window.history.replaceState(null, "", window.location.pathname);
    window.dispatchEvent(new Event(FILTER_EVENT));
  }
  if (loading) return <Loading />;
  const visible = accessibleSparks(state);
  const filtered = discover(state, {
    category,
    query,
    city,
    saved,
    date,
    time,
    sort,
    needsPeople,
  }).filter(
    (s) =>
      (!params.get("subject") ||
        (s.subject ?? s.skill)
          .toLowerCase()
          .includes(params.get("subject")!.toLowerCase())) &&
      (!params.get("level") || s.academicLevel === params.get("level")) &&
      (!params.get("mode") || s.gameMode === params.get("mode")),
  );
  const chips = [
    ...(query ? [{ key: "q", label: `“${query}”` }] : []),
    ...(city !== "all" ? [{ key: "city", label: city }] : []),
    ...(date ? [{ key: "date", label: date }] : []),
    ...(time !== "any"
      ? [{ key: "time", label: `${time[0].toUpperCase()}${time.slice(1)}s` }]
      : []),
    ...(saved ? [{ key: "saved", label: "Saved Sparks" }] : []),
    ...(needsPeople ? [{ key: "spaces", label: "Room for more" }] : []),
  ];
  const title =
    initialCategory === "badminton"
      ? "Find your next game."
      : initialCategory === "study"
        ? "Study better, together."
        : initialCategory === "tutoring"
          ? "Make the tricky bits click."
          : "Find your next good plan.";
  return (
    <>
      <PageHeading
        eyebrow={
          initialCategory === "all"
            ? "Explore Sparks"
            : "Make time for what you love"
        }
        title={title}
        description={
          initialCategory === "tutoring"
            ? "Learn with approved peer tutors in your private school community."
            : "Find a game, a study circle, or people who share your interests."
        }
      >
        <Button asChild variant="secondary">
          <Link
            href={
              category === "all"
                ? "/sparks/create"
                : `/sparks/create?category=${category}`
            }
          >
            <Plus size={15} />
            Create a Spark
          </Link>
        </Button>
      </PageHeading>
      {state.profile.age === "youth" && (
        <div className="info-note" style={{ marginBottom: 22 }}>
          <ShieldCheck
            size={17}
            style={{ display: "inline", marginRight: 7 }}
          />
          You’re exploring your approved school spaces. Public adult activities
          aren’t available to under-18 accounts.
        </div>
      )}
      <div className="filter-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search activity title, description or subject"
            placeholder="A game, a subject, a shared interest…"
            value={query}
            onChange={(e) => update("q", e.target.value)}
          />
        </label>
        <select
          className="input"
          aria-label="Filter by city"
          value={city}
          onChange={(e) => update("city", e.target.value)}
        >
          <option value="all">All of Malaysia</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="filter-saved">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => update("saved", e.target.checked ? "1" : "")}
          />
          <Bookmark size={14} />
          Saved
        </label>
      </div>
      <div className="discovery-controls">
        <span className="filter-caption">
          <SlidersHorizontal size={16} /> Make it work for you
        </span>
        <label>
          On a day
          <input
            aria-label="Filter by date"
            className="input"
            type="date"
            value={date}
            onChange={(e) => update("date", e.target.value)}
          />
        </label>
        <label>
          Around
          <select
            className="input"
            aria-label="Filter by time of day"
            value={time}
            onChange={(e) => update("time", e.target.value)}
          >
            <option value="any">Any time</option>
            <option value="morning">Morning · before 12</option>
            <option value="afternoon">Afternoon · 12–6</option>
            <option value="evening">Evening · after 6</option>
          </select>
        </label>
        <label className="spaces-filter">
          <input
            type="checkbox"
            checked={needsPeople}
            onChange={(e) => update("spaces", e.target.checked ? "1" : "")}
          />{" "}
          Room for more people
        </label>
      </div>
      <CategoryTabs
        value={category}
        onChange={(c) => update("category", c)}
        counts={visible}
      />
      {chips.length > 0 && (
        <div className="filter-chips" aria-label="Active filters">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => update(chip.key, "")}
              aria-label={`Remove ${chip.label} filter`}
            >
              {chip.label}
              <X size={13} />
            </button>
          ))}
          <button className="clear-filters" onClick={reset}>
            Clear filters
          </button>
        </div>
      )}
      <div className="discovery-results-bar">
        {["study", "tutoring"].includes(category) && (
          <div className="category-filters">
            <input
              className="input"
              aria-label="Filter by subject"
              placeholder="Subject, e.g. Maths"
              value={params.get("subject") ?? ""}
              onChange={(e) => update("subject", e.target.value)}
            />
            <select
              className="input"
              aria-label="Filter by academic level"
              value={params.get("level") ?? ""}
              onChange={(e) => update("level", e.target.value)}
            >
              <option value="">All academic levels</option>
              {academicLevels.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </div>
        )}
        {category === "badminton" && (
          <select
            className="input"
            aria-label="Filter by game format"
            value={params.get("mode") ?? ""}
            onChange={(e) => update("mode", e.target.value)}
          >
            <option value="">All formats</option>
            <option value="singles">Singles</option>
            <option value="doubles">Doubles</option>
            <option value="casual">Casual</option>
          </select>
        )}
        <p className="results-count" role="status">
          {filtered.length}{" "}
          {filtered.length === 1 ? "possibility" : "possibilities"} to get
          together
        </p>
        <div className="result-options">
          <select
            aria-label="Sort activities"
            className="sort-select"
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
          >
            <option value="recommended">Recommended for you</option>
            <option value="soonest">Soonest first</option>
            <option value="spaces">Most spaces first</option>
          </select>
          <div className="view-toggle" role="group" aria-label="Results layout">
            <button
              aria-label="Grid view"
              aria-pressed={!list}
              onClick={() => update("view", "")}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              aria-label="List view"
              aria-pressed={list}
              onClick={() => update("view", "list")}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className={`activity-grid ${list ? "activity-list" : ""}`}>
        {filtered.length ? (
          filtered.map((s) => (
            <ActivityCard
              key={s.id}
              spark={s}
              reasons={matchReasons(s, state.profile)}
              window={s.windows.find((window) =>
                matchesWindow(window, { date, time }),
              )}
            />
          ))
        ) : (
          <div className="discovery-empty">
            <Empty
              title="Your thing might be the next Spark."
              description="Try another city or category, clear your filters, or create the activity you'd love to find."
            />
            <button className="text-link" onClick={reset}>
              Clear filters and start again <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
      {["badminton", "study", "tutoring"].includes(initialCategory) && (
        <section className="discovery-place-link">
          <span>{initialCategory === "badminton" ? "🏸" : "📚"}</span>
          <div>
            <span className="eyebrow">A place for your people</span>
            <h2>
              {initialCategory === "badminton"
                ? "Find a court. Get a game going."
                : "Find your next study spot."}
            </h2>
            <p>
              {
                venues.filter(
                  (v) =>
                    v.kind ===
                    (initialCategory === "badminton" ? "badminton" : "study"),
                ).length
              }{" "}
              {initialCategory === "badminton"
                ? "badminton centres with booking links"
                : "libraries, quiet rooms and study spaces"}{" "}
              around KL and Selangor.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link
              href={
                initialCategory === "badminton"
                  ? "/places"
                  : "/places?kind=study"
              }
            >
              Find a {initialCategory === "badminton" ? "court" : "study space"}
              <ArrowRight size={16} />
            </Link>
          </Button>
        </section>
      )}
    </>
  );
}
