"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Send,
  Zap,
  UserPlus,
} from "lucide-react";
import { useApp } from "./store";
import { Badge, Status } from "./shared";
import { dateLabel, timeLabel } from "@/lib/utils";
import { accessibleSparks } from "@/lib/discovery";
import { canConfirm } from "@/lib/engine";
import { personalPlans, planHref, planWindow } from "@/lib/plans";
import { incomingFriendRequests } from "@/lib/social";

export function NextMoves() {
  const { state, demo } = useApp();
  const requests = incomingFriendRequests(state);
  const moves = accessibleSparks(state)
    .flatMap((spark) => {
      if (["COMPLETED", "CANCELLED", "CONFIRMED"].includes(spark.status))
        return [];
      const proposal = state.proposals.find((p) => p.sparkId === spark.id);
      const own = spark.ownerId === state.profile.id;
      const myAction = proposal?.actions.find(
        (a) => a.ownerId === state.profile.id && a.state === "pending",
      );
      if (
        spark.status === "AWAITING_CONFIRMATION" &&
        (myAction || (demo && own))
      )
        return [
          {
            id: spark.id,
            title:
              own && proposal && canConfirm(proposal)
                ? "Every yes is in. Confirm your plan."
                : demo
                  ? "Try the individual consent step."
                  : "An invitation needs your answer.",
            text: spark.title,
            href: `/groups/${spark.id}`,
            icon: own && proposal && canConfirm(proposal) ? Check : Send,
            priority: 0,
          },
        ];
      if (!own) return [];
      if (
        spark.status === "AWAITING_CONFIRMATION" &&
        proposal &&
        canConfirm(proposal)
      )
        return [
          {
            id: spark.id,
            title: "Every yes is in. Confirm your plan.",
            text: spark.title,
            href: `/groups/${spark.id}`,
            icon: Check,
            priority: 0,
          },
        ];
      if (spark.status === "AWAITING_CONFIRMATION")
        return [
          {
            id: spark.id,
            title: "See who has responded.",
            text: spark.title,
            href: `/groups/${spark.id}`,
            icon: Clock3,
            priority: 2,
          },
        ];
      return [
        {
          id: spark.id,
          title: proposal?.feasible
            ? "Your proposal is ready to share."
            : "Find the missing connection.",
          text: spark.title,
          href: `/unlock/${spark.id}`,
          icon: Zap,
          priority: proposal?.feasible ? 1 : 3,
        },
      ];
    })
    .concat(
      requests.length
        ? [
            {
              id: "friend-requests",
              title: `Respond to ${requests.length} friend ${requests.length === 1 ? "request" : "requests"}.`,
              text: "A new connection is waiting for your answer.",
              href: "/connections?view=requests",
              icon: UserPlus,
              priority: -1,
            },
          ]
        : [],
    )
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
  return (
    <section className="next-moves" aria-labelledby="next-moves-title">
      <div className="next-moves-heading">
        <span className="eyebrow">Keep things moving</span>
        <h2 id="next-moves-title">Your next steps</h2>
        <p>Invitations, responses and plans that need a hand.</p>
      </div>
      <div className="next-moves-items">
        {moves.length ? (
          moves.map((move) => (
            <Link key={move.id} href={move.href} className="next-move">
              <span className="next-move-icon">
                <move.icon size={18} />
              </span>
              <div>
                <b>{move.title}</b>
                <small>{move.text}</small>
              </div>
              <ArrowRight size={17} />
            </Link>
          ))
        ) : (
          <div className="next-move">
            <span className="next-move-icon">
              <Check size={18} />
            </span>
            <div>
              <b>You’re all caught up.</b>
              <small>
                No decisions waiting. Find something you’d love to join.
              </small>
            </div>
            <Link href="/explore" className="text-link">
              Find a Spark <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export function MyPlans() {
  const { state } = useApp();
  const [view, setView] = useState<"in-progress" | "confirmed" | "saved">(
    "in-progress",
  );
  const sparks = personalPlans(state, view === "in-progress" ? "active" : view)
    .filter((spark) => view !== "in-progress" || spark.status !== "CONFIRMED")
    .sort(
      (a, b) =>
        Date.parse(planWindow(state, a).start) -
        Date.parse(planWindow(state, b).start),
    );
  return (
    <section className="plans-panel" aria-labelledby="my-plans-title">
      <div className="section-heading">
        <div>
          <h2 id="my-plans-title">Your plans, at a glance</h2>
          <p>The ones you’re organizing, joining or saving.</p>
        </div>
        <Link href="/plans" className="text-link">
          View all plans <ArrowRight size={15} />
        </Link>
      </div>
      <div className="plan-tabs" role="group" aria-label="Your plan status">
        {(["in-progress", "confirmed", "saved"] as const).map((tab) => (
          <button
            key={tab}
            aria-pressed={view === tab}
            onClick={() => setView(tab)}
          >
            {tab === "in-progress"
              ? "In the making"
              : tab === "confirmed"
                ? "Confirmed"
                : "Saved for later"}
          </button>
        ))}
      </div>
      <div className="plan-list">
        {sparks.slice(0, 4).map((spark) => {
          const window = planWindow(state, spark);
          const date = new Date(Date.parse(window.start) + 8 * 3600000);
          return (
            <Link
              key={spark.id}
              href={planHref(state, spark)}
              className="plan-row"
            >
              <span className="plan-date">
                <small>
                  {new Intl.DateTimeFormat("en", {
                    month: "short",
                    timeZone: "UTC",
                  }).format(date)}
                </small>
                <b>{date.getUTCDate()}</b>
              </span>
              <div className="plan-row-copy">
                <b>{spark.title}</b>
                <small>
                  {timeLabel(window.start)} · {spark.city}
                  {spark.status !== "CONFIRMED" ? " · proposed time" : ""}
                </small>
              </div>
              <Status status={spark.status} />
              <ArrowRight size={17} />
            </Link>
          );
        })}
      </div>
      {!sparks.length && (
        <div className="plans-empty">
          <CalendarDays size={26} />
          <h3>
            {view === "confirmed"
              ? "The next “see you there” is on its way."
              : view === "saved"
                ? "Keep your next plan in reach."
                : "Make room for something good."}
          </h3>
          <p>
            {view === "confirmed"
              ? "Plans appear here after every approval is in and the organizer confirms."
              : view === "saved"
                ? "Tap the bookmark on any Spark to keep it here."
                : "Create a Spark or join a plan that feels like you."}
          </p>
          <Link href="/explore" className="text-link">
            Explore Sparks <ArrowRight size={14} />
          </Link>
        </div>
      )}
      {sparks.length > 4 && (
        <Link
          href={`/plans${view === "in-progress" ? "" : `?view=${view}`}`}
          className="text-link spaced-top"
        >
          See all {sparks.length} plans <ArrowRight size={14} />
        </Link>
      )}
      <div className="plans-footnote">
        <Badge tone="neutral">Malaysia time · MYT</Badge>
        <span>
          {sparks.length}{" "}
          {view === "confirmed"
            ? "confirmed"
            : view === "saved"
              ? "saved"
              : "in progress"}
          {sparks[0] ? ` · next ${dateLabel(sparks[0].windows[0].start)}` : ""}
        </span>
      </div>
    </section>
  );
}
