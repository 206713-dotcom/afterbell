"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useApp } from "./store";
import { Loading, PageHeading, Status } from "./shared";
import { Button } from "./ui/button";
import { timeLabel } from "@/lib/utils";
import {
  personalPlans,
  planHref,
  planLabels,
  planViews,
  planWindow,
  type PlanView,
} from "@/lib/plans";

export function PlansPage({
  initialView = "active",
}: {
  initialView?: string;
}) {
  const { state, loading } = useApp();
  const [query, setQuery] = useState("");
  const view: PlanView = planViews.includes(initialView as PlanView)
    ? (initialView as PlanView)
    : "active";
  if (loading) return <Loading />;
  const all = personalPlans(state, view);
  const plans = all
    .filter((s) =>
      `${s.title} ${s.city}`.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => {
      if (view === "drafts")
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      const diff =
        Date.parse(planWindow(state, a).start) -
        Date.parse(planWindow(state, b).start);
      return view === "past" ? -diff : diff;
    });
  return (
    <div className="plans-page">
      <PageHeading
        eyebrow="Your personal space"
        title="My plans"
        description="Everything you’re organizing, joining or saving. Right where you need it."
      >
        <Button asChild variant="secondary">
          <Link href="/sparks/create">
            <Plus size={17} />
            Create a Spark
          </Link>
        </Button>
      </PageHeading>
      <div className="plans-workspace">
        <nav className="plans-view-nav" aria-label="Plan folders">
          {planViews.map((tab) => (
            <Link
              key={tab}
              href={`/plans${tab === "active" ? "" : `?view=${tab}`}`}
              aria-current={view === tab ? "page" : undefined}
            >
              <span>{planLabels[tab]}</span>
              <span className="folder-count">
                {personalPlans(state, tab).length}
              </span>
            </Link>
          ))}
        </nav>
        <section
          className="plans-results"
          aria-labelledby="plans-results-title"
        >
          <div className="plans-results-heading">
            <div>
              <h2 id="plans-results-title">
                {view === "active" ? "Coming together" : planLabels[view]}
              </h2>
              <p>
                {view === "saved"
                  ? "The plans you’ve bookmarked, ready when you are."
                  : view === "drafts"
                    ? "Only you can see these. Open a draft to finish and publish it."
                    : view === "past"
                      ? "Completed and cancelled plans you were part of."
                      : "Open a plan to check the details and your next step."}
              </p>
            </div>
            <label className="plan-search">
              <Search size={17} />
              <input
                aria-label="Search your plans"
                placeholder="Find a plan…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="icon-button"
                  aria-label="Clear plan search"
                  onClick={() => setQuery("")}
                >
                  <X size={15} />
                </button>
              )}
            </label>
          </div>
          <p className="plan-result-count" role="status">
            {plans.length} {plans.length === 1 ? "plan" : "plans"}
            {query ? ` matching “${query}”` : ""} <span>· Times in MYT</span>
          </p>
          <div className="plan-list">
            {plans.map((spark) => {
              const window = planWindow(state, spark);
              const date = new Date(window.start);
              const hub = state.hubs.find((h) => h.id === spark.hubId);
              return (
                <Link
                  key={spark.id}
                  href={planHref(state, spark)}
                  className="plan-row"
                >
                  <span
                    className={`plan-date ${spark.status === "CONFIRMED" ? "is-confirmed" : ""}`}
                  >
                    <small>
                      {new Intl.DateTimeFormat("en", {
                        month: "short",
                        timeZone: "Asia/Kuala_Lumpur",
                      }).format(date)}
                    </small>
                    <b>
                      {new Intl.DateTimeFormat("en", {
                        day: "numeric",
                        timeZone: "Asia/Kuala_Lumpur",
                      }).format(date)}
                    </b>
                  </span>
                  <div className="plan-row-copy">
                    <b>{spark.title}</b>
                    <small>
                      {timeLabel(window.start)} · {spark.city}
                      {spark.status !== "CONFIRMED" &&
                      spark.status !== "COMPLETED"
                        ? " · proposed time"
                        : ""}
                    </small>
                    <small>
                      {hub?.name ?? "Public community"} ·{" "}
                      {spark.ownerId === state.profile.id
                        ? "Organizing"
                        : view === "saved"
                          ? "Saved activity"
                          : "Joining"}
                    </small>
                  </div>
                  <Status status={spark.status} />
                  <ArrowRight size={17} />
                </Link>
              );
            })}
          </div>
          {!plans.length && (
            <div className="plans-empty">
              <span className="plans-empty-symbol">
                {view === "saved" ? (
                  <Bookmark size={27} />
                ) : (
                  <CalendarDays size={27} />
                )}
              </span>
              <h3>
                {query
                  ? "No plans with that name."
                  : view === "drafts"
                    ? "Your next idea starts here."
                    : view === "saved"
                      ? "Keep a good idea for later."
                      : view === "confirmed"
                        ? "Your next “see you there” starts here."
                        : view === "past"
                          ? "Good memories will go here."
                          : "Make room for a good plan."}
              </h3>
              <p>
                {query
                  ? "Try another name or clear your search."
                  : view === "saved"
                    ? "Bookmark any activity in Explore and you’ll find it here."
                    : view === "confirmed"
                      ? "A session appears here once everyone agrees and the organizer confirms."
                      : view === "past"
                        ? "Completed and cancelled sessions appear here."
                        : "Start an activity or find one you’d love to join."}
              </p>
              {query ? (
                <Button variant="outline" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              ) : (
                <Button asChild variant="secondary">
                  <Link
                    href={view === "drafts" ? "/sparks/create" : "/explore"}
                  >
                    {view === "drafts" ? "Create a Spark" : "Find an activity"}
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
      <div className="plans-tip">
        <CalendarDays size={19} />
        <p>
          <b>A time becomes a plan when everyone says yes.</b> Open a confirmed
          session to see responses, add it to your calendar and check in.
        </p>
        <Link className="text-link" href="/plans?view=confirmed">
          See confirmed plans <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
