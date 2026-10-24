"use client";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Check,
  CircleHelp,
  MapPin,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useApp } from "./store";
import { ActivityArt, CategoryIcon } from "./visuals";
import type { Spark, TimeWindow } from "@/lib/types";
import { dateLabel, timeLabel } from "@/lib/utils";
import { Button } from "./ui/button";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Status({ status }: { status: string }) {
  const confirmed = ["CONFIRMED", "COMPLETED"].includes(status);
  const labels: Record<string, string> = {
    BLOCKED: "needs a connection",
    MATCHING: "finding matches",
    PROPOSED: "plan suggested",
    AWAITING_CONFIRMATION: "waiting for approvals",
  };
  return (
    <Badge tone={confirmed ? "green" : status === "BLOCKED" ? "amber" : "blue"}>
      <span className="status-dot" />
      {labels[status] ?? status.replaceAll("_", " ").toLowerCase()}
    </Badge>
  );
}
export function Empty({
  title = "Something good could start here.",
  description = "Have a game, a study circle or an idea in mind? Give your people a plan to join.",
  action = true,
}: {
  title?: string;
  description?: string;
  action?: boolean;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <SparkleIcon />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <Button asChild>
          <Link href="/sparks/create">
            Create a Spark <ArrowRight size={16} />
          </Link>
        </Button>
      )}
    </div>
  );
}
function SparkleIcon() {
  return <Zap size={28} />;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function ActivityCard({
  spark,
  compact = false,
  featured = false,
  reasons = [],
  window = spark.windows[0],
}: {
  spark: Spark;
  compact?: boolean;
  featured?: boolean;
  reasons?: string[];
  window?: TimeWindow;
}) {
  const { state, mutate, notify } = useApp();
  const saved = state.saved.includes(spark.id);
  const remaining = Math.max(0, spark.target - spark.participantIds.length);
  const confirmed = ["CONFIRMED", "COMPLETED"].includes(spark.status);
  return (
    <article
      className={`activity-card ${compact ? "compact-card" : ""} ${featured ? "featured-card" : ""}`}
    >
      <Link
        href={`/sparks/${spark.id}`}
        tabIndex={-1}
        aria-hidden="true"
        className="card-art-link"
      >
        <ActivityArt category={spark.category} />
        {featured ? (
          <span className="featured-date">
            <span className="featured-date-caption">
              <CalendarDays size={14} />
              {confirmed ? "Confirmed time" : "Proposed time"}
            </span>
            <time dateTime={window.start}>{dateLabel(window.start)}</time>
            <span>{timeLabel(window.start)} MYT</span>
          </span>
        ) : (
          <span className="card-art-status">
            {spark.hubId &&
            state.hubs.find((h) => h.id === spark.hubId)?.visibility ===
              "private"
              ? "Private community"
              : "Community Spark"}
          </span>
        )}
      </Link>
      <div className="activity-body">
        <div className="card-topline">
          <span className={`category-label category-${spark.category}`}>
            <CategoryIcon category={spark.category} size={14} />
            {spark.category === "tutoring" ? "Peer tutoring" : spark.category}
          </span>
          <button
            className={`icon-button save-button ${saved ? "saved" : ""}`}
            aria-label={saved ? `Unsave ${spark.title}` : `Save ${spark.title}`}
            aria-pressed={saved}
            onClick={() =>
              void mutate("save", { id: spark.id }).catch(() => {})
            }
          >
            <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <Link href={`/sparks/${spark.id}`} className="card-title">
          {spark.title}
        </Link>
        <p className="card-description">{spark.description}</p>
        {featured && (
          <div className="featured-location">
            <MapPin size={15} aria-hidden="true" />
            <span>{spark.city}</span>
            {spark.skill && (
              <span className="featured-skill">{spark.skill}</span>
            )}
          </div>
        )}
        {reasons.length > 0 && (
          <div className="match-reasons">
            <Check size={12} />
            {reasons.slice(0, 2).join(" · ")}
          </div>
        )}
        {!featured && (
          <div className="card-meta">
            <span>
              <MapPin size={14} />
              {spark.city}
            </span>
            <span>
              <CalendarDays size={14} />
              {dateLabel(window.start)}
            </span>
            <span className="card-time">{timeLabel(window.start)} MYT</span>
          </div>
        )}
        {featured && (
          <div className="featured-availability">
            <Users size={15} aria-hidden="true" />
            <span>
              {spark.participantIds.length} of {spark.target} people
            </span>
            <strong>
              {confirmed
                ? spark.status === "COMPLETED"
                  ? "Session completed"
                  : "Session confirmed"
                : remaining > 0
                  ? `${remaining} ${remaining === 1 ? "place" : "places"} to fill`
                  : "People connected"}
            </strong>
          </div>
        )}
        <div className="card-bottom">
          <div className="avatar-stack">
            {spark.participantIds.slice(0, 3).map((p, i) => (
              <span
                key={p}
                className={`avatar avatar-${["green", "peach", "blue"][i]}`}
              >
                {p.replace("demo-you", "You").slice(0, 1).toUpperCase()}
              </span>
            ))}
            <small>
              {spark.participantIds.length}/{spark.target} people
            </small>
          </div>
          <Link
            href={`/sparks/${spark.id}`}
            className="card-arrow"
            aria-label={`View ${spark.title}`}
            onClick={() => notify("")}
          >
            {featured && <span>View plan</span>}
            <ArrowRight size={18} />
          </Link>
        </div>
        <div
          className="participation-track"
          role="img"
          aria-label={`${spark.participantIds.length} of ${spark.target} people connected`}
        >
          <span
            style={{
              width: `${Math.min(100, (spark.participantIds.length / spark.target) * 100)}%`,
            }}
          />
        </div>
        {!featured && spark.status === "BLOCKED" && (
          <div className="card-blocker">
            <Zap size={13} />
            {spark.requirements.length === 1
              ? "One connection away"
              : "A few missing pieces"}
          </div>
        )}
        {!featured && confirmed && (
          <div className="card-confirmed">
            <Check size={13} />{" "}
            {spark.status === "COMPLETED"
              ? "A good thing happened."
              : "It's happening. You're all set."}
          </div>
        )}
      </div>
    </article>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
  className = "",
  id,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  id?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open) {
      ref.current?.showModal();
      initialFocusRef?.current?.focus();
    } else ref.current?.close();
  }, [open, initialFocusRef]);
  return (
    <dialog
      className={`modal ${className}`}
      id={id}
      aria-labelledby={titleId}
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <div className="error-message" role="alert">
      <CircleHelp size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div
      className="loading-state"
      aria-label="Loading your community"
      role="status"
    >
      <div className="skeleton skeleton-heading" />
      <div className="skeleton skeleton-hero" />
      <div className="activity-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
      <span className="sr-only">Loading your community…</span>
    </div>
  );
}
export function People({ count }: { count: number }) {
  return (
    <span className="inline-meta">
      <Users size={16} />
      {count} {count === 1 ? "person" : "people"}
    </span>
  );
}
