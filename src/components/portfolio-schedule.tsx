"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, GitBranch } from "lucide-react";
import { useApp } from "./store";
import { Badge } from "./shared";
import { accessibleSparks } from "@/lib/discovery";
import { dateLabel, timeLabel } from "@/lib/utils";

export function PortfolioSchedule() {
  const { state } = useApp();
  const [sharedOnly, setSharedOnly] = useState(false);
  const visible = accessibleSparks(state);
  const proposals = state.proposals.filter(
    (p) =>
      p.feasible &&
      p.window &&
      visible.some(
        (s) =>
          s.id === p.sparkId && !["CONFIRMED", "COMPLETED"].includes(s.status),
      ),
  );
  if (proposals.length < 2) return null;
  const usage = new Map<string, number>();
  for (const proposal of proposals)
    for (const action of proposal.actions)
      usage.set(action.candidateId, (usage.get(action.candidateId) ?? 0) + 1);
  const shared = [...usage.values()].filter((count) => count > 1).length;
  const rows = proposals
    .filter(
      (p) =>
        !sharedOnly ||
        p.actions.some((a) => (usage.get(a.candidateId) ?? 0) > 1),
    )
    .sort((a, b) => Date.parse(a.window!.start) - Date.parse(b.window!.start));
  return (
    <section className="portfolio-schedule" aria-labelledby="portfolio-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            <GitBranch size={13} /> THE BIGGER PICTURE
          </span>
          <h2 id="portfolio-title">
            More possibilities. One shared community.
          </h2>
          <p>See the times and offers in your current feasible proposals.</p>
        </div>
        <Badge tone="amber">Proposals · consent still required</Badge>
      </div>
      <div className="portfolio-summary">
        <span>
          <b>{proposals.length}</b> feasible plans
        </span>
        <span>
          <b>{shared}</b> {shared === 1 ? "offer shared" : "offers shared"}{" "}
          across plans
        </span>
        <button
          aria-pressed={sharedOnly}
          disabled={!shared}
          onClick={() => setSharedOnly(!sharedOnly)}
        >
          {sharedOnly ? "Show all plans" : "Show shared connections"}
        </button>
      </div>
      <div className="portfolio-rows">
        {rows.map((proposal) => {
          const spark = visible.find((s) => s.id === proposal.sparkId)!;
          return (
            <Link
              href={`/unlock/${spark.id}`}
              className="portfolio-row"
              key={proposal.id}
            >
              <div className="portfolio-time">
                <b>{dateLabel(proposal.window!.start)}</b>
                <span>
                  {timeLabel(proposal.window!.start)}–
                  {timeLabel(proposal.window!.end)} MYT
                </span>
              </div>
              <div className="portfolio-plan">
                <b>{spark.title}</b>
                <div>
                  {proposal.actions.map((action) => (
                    <span
                      className={
                        (usage.get(action.candidateId) ?? 0) > 1
                          ? "shared-offer"
                          : ""
                      }
                      key={action.id}
                    >
                      {action.label}
                      {(usage.get(action.candidateId) ?? 0) > 1
                        ? " · shared"
                        : ""}
                    </span>
                  ))}
                </div>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          );
        })}
      </div>
      <p className="group-note">
        “Analyze all open Sparks” searches their allocation together.
        Individually generated proposals can compete for offers; final
        confirmation rechecks conflicts and owner approvals. A shared offer is
        never a reservation by itself.
      </p>
    </section>
  );
}
