"use client";
import { useApp } from "./store";
import { demoImpact } from "@/lib/communities";
export function ImpactSummary() {
  const { state, demo } = useApp(),
    metrics = state.impact ?? demoImpact(state);
  return (
    <section className="impact-summary" aria-labelledby="impact-summary-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SMALL PLANS. SHARED PROGRESS.</span>
          <h2 id="impact-summary-title">What your community makes possible.</h2>
          <p>
            {demo
              ? "Computed from fictional demo records."
              : "Computed from eligible accounts and activities your account can access."}{" "}
            Participation counts include confirmed and completed sessions.
          </p>
        </div>
      </div>
      <div className="impact-metrics">
        {[
          ["Registered members", metrics.registered],
          ["Sparks created", metrics.sparksCreated],
          ["Feasible proposals", metrics.unlocked],
          ["Confirmed sessions", metrics.confirmed],
          ["Completed sessions", metrics.completed],
          ["Adult participants", metrics.participatingAdults],
          ["Student participants", metrics.participatingStudents],
          ["Requirements resolved", metrics.resolved],
        ].map(([label, count]) => (
          <div key={label}>
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="subtle">
        For the analyzed proposals: basic matching resolved {metrics.baseline}{" "}
        requirement units; UNLOCK resolved {metrics.resolved}. Proposed plans
        still need everyone’s consent.
      </p>
    </section>
  );
}
