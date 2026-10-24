"use client";
import { useState } from "react";
import { Box, Check, Clock3, GitBranch, Info, Users, Zap } from "lucide-react";
import { useApp } from "./store";
import { Status } from "./shared";
import { dateLabel, timeLabel } from "@/lib/utils";
import type { Proposal, Spark } from "@/lib/types";

type Node = {
  id: string;
  label: string;
  caption: string;
  kind: string;
  status: "connected" | "proposed" | "accepted" | "blocked";
  detail: string;
  facts?: string[];
};
export function LabNetwork({
  spark,
  proposal,
}: {
  spark: Spark;
  proposal?: Proposal;
}) {
  const { state } = useApp();
  const [original, setOriginal] = useState(false);
  const [selected, setSelected] = useState("people");
  const confirmed = ["CONFIRMED", "COMPLETED"].includes(spark.status);
  const showProposal = !!proposal && !original;
  const time = showProposal ? proposal.window : spark.windows[0];
  const left: Node[] = [
    {
      id: "people",
      label: `${spark.participantIds.length} people on board`,
      caption: "Already in this plan",
      kind: "people",
      status: "connected",
      detail: `This Spark has ${spark.participantIds.length} connected participants and a target of ${spark.target}. The engine searches for the remaining people and checks existing participants for conflicting confirmed plans.`,
      facts: [
        `${Math.max(0, spark.target - spark.participantIds.length)} more people needed`,
      ],
    },
    {
      id: "time",
      label: time
        ? `${dateLabel(time.start)}, ${timeLabel(time.start)}`
        : "A shared time is missing",
      caption:
        showProposal && proposal.feasible
          ? confirmed
            ? "Session confirmed"
            : "Compatible proposed window"
          : "Original preferred window",
      kind: "time",
      status:
        showProposal && proposal.feasible
          ? confirmed
            ? "accepted"
            : "proposed"
          : "connected",
      detail:
        showProposal && time
          ? `The engine selected ${timeLabel(time.start)}–${timeLabel(time.end)} MYT. It checks full-window availability and existing reservations for every proposed offer. ${confirmed ? "The organizer has confirmed this session." : "A compatible time is still a proposal until all approvals arrive."}`
          : `There are ${spark.windows.length} supplied time windows. UNLOCK can explore these windows; it cannot invent availability or book a time without consent.`,
      facts: time
        ? [
            `${timeLabel(time.start)}–${timeLabel(time.end)} MYT`,
            `${spark.windows.length} supplied windows`,
          ]
        : [],
    },
  ];
  const right: Node[] = showProposal
    ? [
        ...proposal.actions.map((action): Node => {
          const candidate = state.candidates.find(
            (c) => c.id === action.candidateId,
          );
          return {
            id: action.id,
            label: action.label,
            kind: action.kind,
            caption:
              action.state === "accepted"
                ? "Owner accepted"
                : action.state === "declined"
                  ? "Declined · replacement needed"
                  : "Explicit approval needed",
            status:
              action.state === "accepted"
                ? "accepted"
                : action.state === "declined"
                  ? "blocked"
                  : "proposed",
            detail: action.explanation,
            facts: [
              `${action.quantity} ${action.kind} · ${action.cost ? `RM ${action.cost}` : "No cost"}`,
              ...(candidate?.needs.map(
                (need) =>
                  `Depends on ${need.quantity} ${need.skill ?? ""} ${need.kind}`,
              ) ?? []),
              ...(candidate?.capacity
                ? [`Capacity: ${candidate.capacity}`]
                : []),
              confirmed
                ? "Confirmed session reservation"
                : "No reservation made",
            ],
          };
        }),
        ...proposal.remainingBlockers.map((blocker, i): Node => ({
          id: `remaining-${i}`,
          label: blocker,
          caption: "Still unresolved",
          kind: "blocker",
          status: "blocked",
          detail:
            "No compatible combination was found for this requirement within the supplied availability, budget, permissions, and search bound. Try a different window or ask your community for an opted-in offer.",
        })),
      ]
    : spark.requirements.map((requirement): Node => ({
        id: requirement.id,
        label: `${requirement.quantity} ${requirement.skill ?? ""} ${requirement.kind}`,
        caption: "A missing piece",
        kind: requirement.kind,
        status: "blocked",
        detail: `This plan requires ${requirement.quantity} ${requirement.kind}${requirement.skill ? ` with ${requirement.skill} skills` : ""}. The engine must satisfy this requirement and any dependencies introduced by a proposed offer.`,
        facts: requirement.capacity
          ? [`Minimum capacity: ${requirement.capacity}`]
          : [],
      }));
  if (!right.length)
    right.push({
      id: "no-gaps",
      label: "No additional offers needed",
      caption: confirmed ? "Session confirmed" : "Check the time and approvals",
      kind: "resource",
      status: confirmed ? "accepted" : "connected",
      detail:
        "There are no additional people or resource actions in this proposal. The organizer must still explicitly confirm the session when it is ready.",
    });
  const nodes = [...left, ...right];
  const active = nodes.find((n) => n.id === selected) ?? nodes[0];
  return (
    <section
      className="interactive-network"
      aria-label="Interactive activity dependency network"
    >
      <div className="network-toolbar">
        <span>
          <GitBranch size={16} /> THE POSSIBILITY NETWORK
        </span>
        <Status status={spark.status} />
      </div>
      <div className="network-view-controls">
        <div role="group" aria-label="Network view">
          <button
            aria-pressed={!showProposal}
            onClick={() => setOriginal(true)}
          >
            Original plan
          </button>
          <button
            aria-pressed={showProposal}
            disabled={!proposal}
            onClick={() => setOriginal(false)}
          >
            UNLOCK proposal
          </button>
        </div>
        <span>
          <Info size={13} /> Select any connection to inspect it
        </span>
      </div>
      <div
        className="dependency-graph"
        style={{ minHeight: Math.max(300, right.length * 100 + 50) }}
      >
        <svg
          className="dependency-lines"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M22 25 C40 25 38 50 50 50 M22 75 C40 75 38 50 50 50" />
          {right.map((node, i) => (
            <path
              key={node.id}
              className={`edge-${node.status}`}
              d={`M50 50 C64 50 61 ${((i + 0.5) * 100) / right.length} 78 ${((i + 0.5) * 100) / right.length}`}
            />
          ))}
        </svg>
        <div className="dependency-column dependency-inputs">
          {left.map(renderNode)}
        </div>
        <div className="dependency-core">
          <Zap size={26} fill="currentColor" />
          <b>Your Spark</b>
          <small>
            {showProposal
              ? proposal.feasible
                ? "A feasible way forward"
                : "Keep connecting"
              : "A plan with potential"}
          </small>
        </div>
        <div className="dependency-column">{right.map(renderNode)}</div>
      </div>
      <div className="connection-inspector" aria-live="polite">
        <span className={`inspector-icon node-${active.status}`}>
          {active.status === "accepted" ? (
            <Check size={19} />
          ) : (
            <Info size={19} />
          )}
        </span>
        <div>
          <span className="eyebrow">CONNECTION DETAILS</span>
          <h3>{active.label}</h3>
          <p>{active.detail}</p>
          {active.facts && (
            <div className="inspector-facts">
              {active.facts.map((fact) => (
                <span key={fact}>{fact}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="network-key">
        <span>
          <i className="node-dot node-connected" /> Already connected
        </span>
        <span>
          <i className="node-dot node-blocked" /> Unresolved
        </span>
        <span>
          <i className="node-dot node-proposed" /> Proposed
        </span>
        <span>
          <i className="node-dot node-accepted" /> Accepted
        </span>
      </div>
    </section>
  );
  function renderNode(node: Node) {
    const Icon =
      node.kind === "time"
        ? Clock3
        : ["participant", "tutor", "people"].includes(node.kind)
          ? Users
          : Box;
    return (
      <button
        key={node.id}
        className={`dependency-node node-${node.status}`}
        aria-pressed={active.id === node.id}
        onClick={() => setSelected(node.id)}
      >
        <Icon size={17} />
        <b>{node.label}</b>
        <small>{node.caption}</small>
      </button>
    );
  }
}
