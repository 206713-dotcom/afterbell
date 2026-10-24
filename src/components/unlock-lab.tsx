"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Circle,
  GitBranch,
  LockKeyhole,
  Play,
  Send,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useApp } from "./store";
import { Badge, Empty, Loading, PageHeading, Status } from "./shared";
import { Button } from "./ui/button";
import { CategoryIcon } from "./visuals";
import { LabNetwork } from "./lab-network";
import { ScenarioPlayground } from "./scenario-playground";
import { PortfolioSchedule } from "./portfolio-schedule";
import { accessibleSparks } from "@/lib/discovery";
import { dateLabel, timeLabel } from "@/lib/utils";
export function UnlockLab({ id }: { id?: string }) {
  const { state, demo, loading, mutate, notify } = useApp(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(id ?? "saturday-doubles"),
    [compare, setCompare] = useState(false);
  if (loading) return <Loading />;
  const sparks = accessibleSparks(state);
  const spark = sparks.find((s) => s.id === selected) ?? sparks[0];
  if (!spark)
    return (
      <>
        <PageHeading
          eyebrow="THE UNLOCK LAB"
          title="A little missing piece. A new possibility."
          description="Create a Spark to start exploring what could make it happen."
        />
        <Empty />
      </>
    );
  const proposal = state.proposals.find((p) => p.sparkId === spark.id);
  const confirmed = ["CONFIRMED", "COMPLETED"].includes(spark.status);
  async function run(portfolio = false) {
    if (!spark) return;
    setBusy(true);
    try {
      await mutate(portfolio ? "portfolio" : "unlock", { id: spark.id });
      notify(
        portfolio
          ? "Portfolio search complete. Shared people and resources are checked across sessions."
          : "Analysis complete. Possibility, explained.",
      );
    } catch {
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    try {
      await mutate("send", { id: spark.id });
      router.push(`/groups/${spark.id}`);
    } catch {}
  }
  const isOrganizer = demo || spark.ownerId === state.profile.id;
  return (
    <>
      <PageHeading
        eyebrow="UNLOCK Lab"
        title="A good plan. A way forward."
        description="Find people, resources, and a time that work together."
      >
        <Badge tone="green">
          <Zap size={12} />
          Every match, explained
        </Badge>
      </PageHeading>
      <section className="unlock-intro">
        <div>
          <span className="eyebrow">Connect what your plan is missing</span>
          <h2>One missing piece can change the plan.</h2>
          <p>
            A player who needs a racket. A tutor who needs a room. UNLOCK checks
            the connections and finds a proposal you can review. Everyone still
            gives their own yes.
          </p>
        </div>
        <Button disabled={busy || !isOrganizer} onClick={() => void run(true)}>
          <GitBranch size={15} />
          {busy ? "Searching possibilities…" : "Analyze all open Sparks"}
        </Button>
      </section>
      <div className="filter-toolbar lab-scenario-toolbar">
        <label className="field-label" htmlFor="scenario">
          Explore a Spark
        </label>
        <select
          className="input"
          id="scenario"
          value={spark.id}
          onChange={(e) => {
            setSelected(e.target.value);
            if (id) router.push(`/unlock/${e.target.value}`);
          }}
        >
          {sparks.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          disabled={
            busy ||
            !isOrganizer ||
            ["CONFIRMED", "COMPLETED"].includes(spark.status)
          }
          onClick={() => void run()}
        >
          <Play size={14} />
          {busy ? "Finding a way…" : "Run UNLOCK"}
        </Button>
      </div>
      <div className="lab-layout">
        <div>
          <LabNetwork key={spark.id} spark={spark} proposal={proposal} />
          {proposal && (
            <>
              <div className="analysis-stats">
                <div className="analysis-stat">
                  <b>{proposal.actions.length}</b>
                  <small>COMMITMENTS PROPOSED</small>
                </div>
                <div className="analysis-stat">
                  <b>{proposal.explored.toLocaleString()}</b>
                  <small>CANDIDATE STATES CHECKED</small>
                </div>
                <div className="analysis-stat">
                  <b>RM {proposal.cost}</b>
                  <small>PROPOSED TOTAL COST</small>
                </div>
              </div>
              <div className="analysis-card">
                <Badge
                  tone={
                    confirmed ? "green" : proposal.feasible ? "amber" : "red"
                  }
                >
                  {confirmed
                    ? "Every approval received"
                    : proposal.feasible
                      ? "Mathematically feasible · approval required"
                      : "A few pieces are still missing"}
                </Badge>
                <h3>
                  {confirmed
                    ? spark.status === "COMPLETED"
                      ? "A good thing happened."
                      : "Everyone said yes. It’s happening."
                    : proposal.feasible
                      ? "Here's a way to make this happen."
                      : "Here's what we found."}
                </h3>
                <p>
                  {confirmed
                    ? `This session ${spark.status === "COMPLETED" ? "was completed" : "is confirmed"} with explicit participant and resource owner approvals${proposal.window ? ` for ${dateLabel(proposal.window.start)}, ${timeLabel(proposal.window.start)}–${timeLabel(proposal.window.end)} MYT` : ""}. Open the session room for attendance and the latest details.`
                    : proposal.feasible
                      ? `A compatible combination was found${proposal.window ? ` for ${dateLabel(proposal.window.start)}, ${timeLabel(proposal.window.start)}–${timeLabel(proposal.window.end)}` : ""}. No people or resources have been reserved. Every proposed action below needs an explicit yes.`
                      : proposal.remainingBlockers.join(" · ") ||
                        "No valid time window was supplied."}
                </p>
                {proposal.truncated && (
                  <p className="spaced-top">
                    The search reached its {proposal.explored}-state bound. This
                    is the best solution found, not a proven global optimum.
                  </p>
                )}
                {proposal.alternatives.length > 1 && (
                  <p className="spaced-top">
                    Other feasible times:{" "}
                    {proposal.alternatives
                      .slice(1)
                      .map(
                        (w) => `${dateLabel(w.start)} at ${timeLabel(w.start)}`,
                      )
                      .join("; ")}
                    .
                  </p>
                )}
              </div>
              {proposal.actions.map((a, i) => (
                <div className="action-row" key={a.id}>
                  <span className="lab-step-number">{i + 1}</span>
                  <div>
                    <h3>{a.label}</h3>
                    <p>{a.explanation}</p>
                    <div className="spaced-top">
                      <Badge tone={a.state === "accepted" ? "green" : "amber"}>
                        {a.state === "accepted"
                          ? "Accepted"
                          : a.state === "declined"
                            ? "Declined"
                            : "Proposed · pending consent"}
                      </Badge>
                    </div>
                  </div>
                  {a.state === "accepted" ? (
                    <Check size={17} />
                  ) : (
                    <LockKeyhole size={17} />
                  )}
                </div>
              ))}
              {proposal.feasible && (
                <div className="form-actions">
                  <span className="subtle">
                    <ShieldCheck
                      size={13}
                      style={{ display: "inline", marginRight: 5 }}
                    />
                    {confirmed
                      ? "Every required approval has been received."
                      : "Feasibility is a proposal, not a booking."}
                  </span>
                  {["AWAITING_CONFIRMATION", "CONFIRMED", "COMPLETED"].includes(
                    spark.status,
                  ) ? (
                    <Button asChild variant="secondary">
                      <Link href={`/groups/${spark.id}`}>
                        Open session room <ArrowRight size={14} />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => void send()}
                      disabled={
                        !isOrganizer ||
                        ["CONFIRMED", "COMPLETED"].includes(spark.status)
                      }
                    >
                      <Send size={14} />
                      Send invitations
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
          <div className="analysis-card spaced-top">
            <div className="settings-row">
              <div>
                <h3>Beyond basic discovery.</h3>
                <p>
                  Compare against a simple baseline that finds dependency-free
                  participants at the original time, without resource or
                  schedule search.
                </p>
              </div>
              <button
                className="text-link"
                onClick={() => setCompare(!compare)}
                aria-expanded={compare}
              >
                {compare ? "Hide comparison" : "Compare"}
                <ArrowRight size={13} />
              </button>
            </div>
            {compare && (
              <>
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>Measured result</th>
                      <th>Basic matching</th>
                      <th>UNLOCK</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Commitments found</td>
                      <td>{proposal?.baselineResolved ?? "Run analysis"}</td>
                      <td>{proposal?.resolved ?? "Run analysis"}</td>
                    </tr>
                    <tr>
                      <td>Resource dependency search</td>
                      <td>No</td>
                      <td>Yes</td>
                    </tr>
                    <tr>
                      <td>Alternative time windows</td>
                      <td>Original only</td>
                      <td>{spark.windows.length} supplied</td>
                    </tr>
                    <tr>
                      <td>Actually confirmed</td>
                      <td>—</td>
                      <td>
                        {["CONFIRMED", "COMPLETED"].includes(spark.status)
                          ? "Yes"
                          : "No"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="group-note">
                  Counts come from the current input and solver output. Bounded
                  search can miss a better solution; it does not prove global
                  optimality.
                </p>
              </>
            )}
          </div>
          {!confirmed && (
            <ScenarioPlayground key={`experiment-${spark.id}`} spark={spark} />
          )}
        </div>
        <aside className="lab-sidebar">
          <div className="side-panel">
            <span className="eyebrow">FROM BLOCKED TO TOGETHER</span>
            {[
              {
                title: "Identify the little gaps",
                text: "Check participants, skills, time windows, resources, and permissions.",
              },
              {
                title: "Find a feasible combination",
                text: "Try compatible, opted-in offers and their dependencies within the search bound.",
              },
              {
                title: "Let everyone choose",
                text: "Send individual invitations and resource approval requests.",
              },
              {
                title: "Make it happen",
                text: "Only confirm when every requirement and approval is satisfied.",
              },
            ].map((x, i) => (
              <div
                className={`lab-step ${i === 0 || (proposal && i === 1) || (spark.status === "AWAITING_CONFIRMATION" && i === 2) || (["CONFIRMED", "COMPLETED"].includes(spark.status) && i === 3) ? "active" : ""}`}
                key={x.title}
              >
                <span className="lab-step-number">{i + 1}</span>
                <div>
                  <h3>{x.title}</h3>
                  <p>{x.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="side-panel">
            <span className="eyebrow">THE ORIGINAL BLOCKERS</span>
            <h3>{spark.title}</h3>
            <div className="requirement-list">
              {(
                proposal?.blockers ??
                spark.requirements.map(
                  (r) => `${r.quantity} ${r.skill ?? ""} ${r.kind}`,
                )
              ).map((b, i) => (
                <div
                  key={i}
                  className="subtle"
                  style={{ display: "flex", gap: 7, alignItems: "center" }}
                >
                  <Circle size={10} style={{ color: "#b59453" }} />
                  {b}
                </div>
              ))}
            </div>
            <Link className="text-link spaced-top" href={`/sparks/${spark.id}`}>
              See the full Spark <ArrowRight size={13} />
            </Link>
          </div>
        </aside>
      </div>
      <PortfolioSchedule />
      <section className="spaced-top">
        <div className="section-heading">
          <h2>More plans with possibility.</h2>
          <Link href="/explore" className="text-link">
            Explore Sparks <ArrowRight size={13} />
          </Link>
        </div>
        <div className="proposal-list">
          {sparks
            .filter((s) => s.id !== spark.id)
            .slice(0, 4)
            .map((s) => (
              <div className="proposal-card" key={s.id}>
                <span className="proposal-card-icon">
                  <CategoryIcon category={s.category} size={22} />
                </span>
                <div className="proposal-card-main">
                  <h3>{s.title}</h3>
                  <Status status={s.status} />
                  <p>
                    {s.city} · {s.participantIds.length}/{s.target} people
                    connected
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelected(s.id);
                    if (id) router.push(`/unlock/${s.id}`);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Explore possibility <ArrowRight size={13} />
                </Button>
              </div>
            ))}
        </div>
      </section>
    </>
  );
}
