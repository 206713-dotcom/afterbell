"use client";
import { useState } from "react";
import { ArrowRight, FlaskConical, RotateCcw } from "lucide-react";
import { useApp } from "./store";
import { Badge } from "./shared";
import { Button } from "./ui/button";
import { unlock } from "@/lib/engine";
import { dateLabel, timeLabel } from "@/lib/utils";
import type { Proposal, Spark } from "@/lib/types";

export function ScenarioPlayground({ spark }: { spark: Spark }) {
  const { state } = useApp();
  const [excluded, setExcluded] = useState("");
  const [timeIndex, setTimeIndex] = useState("all");
  const [budget, setBudget] = useState(spark.budget);
  const [result, setResult] = useState<Proposal | null>(null);
  const offers = state.candidates.filter(
    (c) =>
      c.city === spark.city &&
      c.hubId === spark.hubId &&
      c.approved &&
      c.optedIn &&
      !state.blocked.includes(c.ownerId),
  );
  function analyze() {
    const conflicts = [
      ...(spark.conflicts ?? []),
      ...state.sparks
        .filter(
          (other) =>
            other.id !== spark.id &&
            ["CONFIRMED", "COMPLETED"].includes(other.status) &&
            other.participantIds.some((id) =>
              spark.participantIds.includes(id),
            ),
        )
        .flatMap((other) => other.windows),
    ];
    const pool = offers.filter(
      (c) =>
        c.id !== excluded &&
        !state.declines?.some(
          (d) => d.sparkId === spark.id && d.candidateId === c.id,
        ),
    );
    setResult(
      unlock(
        {
          ...spark,
          budget,
          windows:
            timeIndex === "all"
              ? spark.windows
              : [spark.windows[Number(timeIndex)]],
          conflicts,
        },
        pool,
        state.blocked,
      ),
    );
  }
  function clearResult() {
    setResult(null);
  }
  return (
    <details className="scenario-playground">
      <summary>
        <span className="playground-icon">
          <FlaskConical size={21} />
        </span>
        <span>
          <b>What if one piece changed?</b>
          <small>Test a different time, budget, or missing offer.</small>
        </span>
        <span className="playground-expand">
          Try it <ArrowRight size={15} />
        </span>
      </summary>
      <div className="playground-content">
        <p>
          This is a temporary simulation using the same constraint engine. Your
          Spark, invitations, and reservations stay as they are.
        </p>
        <div className="playground-fields">
          <label className="field">
            Try this time
            <select
              value={timeIndex}
              onChange={(e) => {
                setTimeIndex(e.target.value);
                clearResult();
              }}
            >
              <option value="all">All supplied windows</option>
              {spark.windows.map((window, i) => (
                <option key={window.start} value={i}>
                  {dateLabel(window.start)}, {timeLabel(window.start)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            If this offer is unavailable
            <select
              value={excluded}
              onChange={(e) => {
                setExcluded(e.target.value);
                clearResult();
              }}
            >
              <option value="">Keep all available offers</option>
              {offers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Total budget (RM)
            <input
              type="number"
              min="0"
              max="10000"
              step="1"
              value={budget}
              onChange={(e) => {
                setBudget(Math.min(10000, Math.max(0, Number(e.target.value))));
                clearResult();
              }}
            />
          </label>
        </div>
        <div className="form-actions">
          <button
            className="text-link"
            onClick={() => {
              setExcluded("");
              setTimeIndex("all");
              setBudget(spark.budget);
              setResult(null);
            }}
          >
            <RotateCcw size={14} /> Reset experiment
          </button>
          <Button variant="secondary" onClick={analyze}>
            <FlaskConical size={15} /> Test this scenario
          </Button>
        </div>
        {result && (
          <div
            className={`scenario-result ${result.feasible ? "scenario-feasible" : ""}`}
            role="status"
          >
            <Badge tone={result.feasible ? "green" : "amber"}>
              {result.feasible
                ? "Feasible in this simulation"
                : "This combination is still blocked"}
            </Badge>
            <h3>
              {result.feasible
                ? `${result.actions.length} commitments · RM ${result.cost}`
                : "Here’s what would still be missing."}
            </h3>
            <p>
              {result.feasible && result.window
                ? `${dateLabel(result.window.start)}, ${timeLabel(result.window.start)}–${timeLabel(result.window.end)} MYT. ${result.actions.map((a) => a.label).join(" + ") || "No additional offers needed"}. Approvals would still be required.`
                : result.remainingBlockers.join(" · ") ||
                  "No compatible time window found."}
            </p>
            <small>
              {result.explored} candidate states checked
              {result.truncated ? " · search bound reached" : ""} · No saved
              proposal was changed.
            </small>
          </div>
        )}
      </div>
    </details>
  );
}
