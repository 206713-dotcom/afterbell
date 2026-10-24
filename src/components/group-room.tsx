"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Download,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  LockKeyhole,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { useApp } from "./store";
import { Button } from "./ui/button";
import { Badge, Empty, Loading, Modal, PageHeading, Status } from "./shared";
import { canConfirm } from "@/lib/engine";
import { dateLabel, timeLabel } from "@/lib/utils";
import { sessionCalendar } from "@/lib/calendar";
import { canReadSpark } from "@/lib/communities";
import { SparkPlace } from "./places";
export function GroupRoom({ id }: { id: string }) {
  const { state, demo, loading, mutate, notify } = useApp();
  const [busy, setBusy] = useState(false),
    [cancelOpen, setCancelOpen] = useState(false);
  if (loading) return <Loading />;
  const spark = state.sparks.find((s) => s.id === id),
    proposal = state.proposals.find((p) => p.sparkId === id);
  if (!spark || !proposal || !canReadSpark(state, spark))
    return (
      <>
        <PageHeading
          eyebrow="THE SESSION ROOM"
          title="Your next plan starts with a possibility."
          description="Analyze an activity and send a proposal to bring everyone together."
        />
        <Empty
          title="Your session starts with a proposal."
          description="Run UNLOCK on a Spark, then send the invitations to open a session room."
          action={false}
        />
      </>
    );
  const confirmed = ["CONFIRMED", "COMPLETED"].includes(spark.status),
    organizer = demo || spark.ownerId === state.profile.id;
  const ready =
    canConfirm(proposal) && spark.status === "AWAITING_CONFIRMATION";
  const attended = state.attendance?.some(
    (a) => a.sparkId === id && a.userId === state.profile.id,
  );
  function downloadCalendar() {
    if (!spark || !proposal?.window || spark.status !== "CONFIRMED") return;
    const url = URL.createObjectURL(
      new Blob([sessionCalendar(spark, proposal.window)], {
        type: "text/calendar;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `afterbell-${spark.id}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(
      "Calendar file downloaded. Check the session room for later changes; the file does not sync automatically.",
    );
  }
  async function action(
    op:
      | "send"
      | "respond"
      | "confirm"
      | "complete"
      | "cancel"
      | "attendance"
      | "withdraw",
    extra: Record<string, unknown> = {},
  ) {
    setBusy(true);
    try {
      await mutate(op, { id, ...extra });
      notify(
        op === "confirm"
          ? "Every approval is in. Your session is confirmed."
          : op === "complete"
            ? "A good thing happened. Session marked complete."
            : op === "respond"
              ? "Response recorded."
              : op === "cancel"
                ? "Session cancelled. Resource reservations released."
                : op === "withdraw"
                  ? "Cancellation recorded. This session is blocked until a replacement is approved."
                  : op === "attendance"
                    ? "Your attendance is recorded."
                    : "Invitations are ready for individual responses.",
      );
      if (op === "cancel") setCancelOpen(false);
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link href={`/sparks/${id}`} className="back-link">
        <ArrowLeft size={14} />
        Back to the Spark
      </Link>
      <SparkPlace spark={spark} />
      <header className="session-header">
        <span className="eyebrow">
          THE SESSION ROOM · FROM POSSIBILITY TO A PLAN
        </span>
        <Status status={spark.status} />
        <h1>{spark.title}</h1>
        <p>
          <CalendarDays
            size={14}
            style={{ display: "inline", marginRight: 7 }}
          />
          {proposal.window
            ? `${dateLabel(proposal.window.start)} · ${timeLabel(proposal.window.start)}–${timeLabel(proposal.window.end)} MYT`
            : "A shared time is still needed"}{" "}
          <span style={{ margin: "0 8px" }}>·</span>
          {spark.city}
        </p>
      </header>
      {spark.status === "CONFIRMED" && proposal.window && (
        <div className="calendar-ready">
          <div>
            <CalendarDays size={21} />
            <span>
              <b>Put something good on your calendar.</b>
              <small>
                Download this confirmed session. Updates stay in your session
                room.
              </small>
            </span>
          </div>
          <Button variant="outline" onClick={downloadCalendar}>
            <Download size={15} /> Add to calendar
          </Button>
        </div>
      )}
      {demo && (
        <div className="info-note" style={{ marginBottom: 22 }}>
          <h3>
            <ShieldCheck size={16} />
            You’re directing the fictional demo.
          </h3>
          Each “Simulate acceptance” below represents that person’s explicit
          response. Live accounts can only accept their own invitations or
          approve resources they own. Nothing has been sent to a real person.
        </div>
      )}
      <div className="detail-grid">
        <div>
          <div className="section-heading">
            <div>
              <h2>Everyone gets to say yes.</h2>
              <p>
                {proposal.actions.filter((a) => a.state === "accepted").length}{" "}
                of {proposal.actions.length} individual approvals received.
              </p>
            </div>
            <Badge tone={confirmed ? "green" : "amber"}>
              {confirmed ? "It's happening" : "Consent comes first"}
            </Badge>
          </div>
          {proposal.actions.map((a) => (
            <article className="action-row" key={a.id}>
              <span
                className={`avatar avatar-${a.state === "accepted" ? "green" : "peach"}`}
              >
                {a.label[0]}
              </span>
              <div>
                <h3>{a.label}</h3>
                <p>
                  {a.kind === "participant" || a.kind === "tutor"
                    ? "Participation invitation"
                    : "Resource owner approval"}{" "}
                  · {a.quantity} {a.kind} ·{" "}
                  {a.cost ? `RM ${a.cost}` : "No cost"}
                </p>
                <p>{a.explanation}</p>
                <div className="spaced-top">
                  <Badge
                    tone={
                      a.state === "accepted"
                        ? "green"
                        : a.state === "declined"
                          ? "red"
                          : "amber"
                    }
                  >
                    {a.state === "accepted"
                      ? "Explicitly accepted"
                      : a.state === "declined"
                        ? "Declined"
                        : "Awaiting a response"}
                  </Badge>
                </div>
                {a.state === "pending" &&
                  spark.status === "AWAITING_CONFIRMATION" &&
                  (demo || a.ownerId === state.profile.id) && (
                    <div className="action-buttons">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void action("respond", {
                            actionId: a.id,
                            accept: true,
                          })
                        }
                      >
                        <Check size={13} />
                        {demo ? "Simulate acceptance" : "Accept my invitation"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void action("respond", {
                            actionId: a.id,
                            accept: false,
                          })
                        }
                      >
                        <X size={13} />
                        {demo ? "Simulate decline" : "Decline"}
                      </Button>
                    </div>
                  )}
              </div>
              {a.state === "accepted" ? (
                <CheckCircle2 size={18} />
              ) : (
                <Clock3 size={18} />
              )}
            </article>
          ))}
          <div className="form-card spaced-top">
            <h2>The people already on board.</h2>
            <div className="members-list">
              {spark.participantIds.map((p, i) => (
                <div key={p} className="member-row">
                  <span
                    className={`avatar avatar-${i % 2 ? "peach" : "green"}`}
                  >
                    {p === state.profile.id ? state.profile.name[0] : "M"}
                  </span>
                  <div>
                    {p === state.profile.id
                      ? `${state.profile.name} · you`
                      : spark.hubId
                        ? `Approved hub member ${i + 1}`
                        : `Participant ${i + 1}`}
                    <small>
                      {p === spark.ownerId
                        ? "Session organizer"
                        : "Participation connected"}
                    </small>
                  </div>
                  <Badge tone="green">
                    <Check size={10} />
                    On board
                  </Badge>
                </div>
              ))}
            </div>
            <p className="group-note">
              Student details stay inside approved hubs. Member names are
              minimized in the demonstration.
            </p>
          </div>
          {confirmed && (
            <div className="form-card spaced-top">
              <h2>Make it count.</h2>
              <p>
                Record attendance when your session happens. The organizer can
                mark the activity complete.
              </p>
              <div className="action-buttons">
                {spark.participantIds.includes(state.profile.id) && (
                  <Button
                    variant="outline"
                    disabled={busy || attended}
                    onClick={() => void action("attendance")}
                  >
                    <Check size={14} />
                    {attended ? "Attendance recorded" : "Confirm my attendance"}
                  </Button>
                )}
                {organizer && spark.status === "CONFIRMED" && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void action("complete")}
                  >
                    <CheckCircle2 size={14} />
                    Mark session completed
                  </Button>
                )}
                {spark.status === "CONFIRMED" &&
                  (demo ||
                    (spark.participantIds.includes(state.profile.id) &&
                      spark.ownerId !== state.profile.id)) && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void action(
                          "withdraw",
                          demo
                            ? {
                                userId:
                                  proposal.actions.find(
                                    (a) =>
                                      a.kind === "participant" ||
                                      a.kind === "tutor",
                                  )?.ownerId ??
                                  spark.participantIds.find(
                                    (u) => u !== spark.ownerId,
                                  ),
                              }
                            : {},
                        )
                      }
                    >
                      {demo
                        ? "Simulate player cancellation"
                        : "I can no longer make it"}
                    </Button>
                  )}
              </div>
            </div>
          )}
        </div>
        <aside>
          <div className="side-panel">
            <span className="eyebrow">READY WHEN EVERYONE IS</span>
            <h3>A little checklist.</h3>
            <div className="checklist">
              {[
                {
                  text: "A feasible combination was found",
                  done: proposal.feasible,
                },
                {
                  text: "Invitations sent to each person",
                  done: [
                    "AWAITING_CONFIRMATION",
                    "CONFIRMED",
                    "COMPLETED",
                  ].includes(spark.status),
                },
                {
                  text: "Every required owner has approved",
                  done: proposal.actions.every((a) => a.state === "accepted"),
                },
                {
                  text: "Resources reserved without conflicts",
                  done: confirmed,
                },
                { text: "Session explicitly confirmed", done: confirmed },
              ].map((item) => (
                <div className={item.done ? "done" : ""} key={item.text}>
                  {item.done ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Circle size={16} />
                  )}
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            {organizer && (
              <>
                {spark.status === "PROPOSED" && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void action("send")}
                  >
                    <Send size={14} />
                    Send invitations
                  </Button>
                )}
                {!confirmed && spark.status !== "CANCELLED" && (
                  <Button
                    variant="secondary"
                    className="full-width"
                    style={{ marginTop: 24 }}
                    disabled={busy || !ready}
                    onClick={() => void action("confirm")}
                  >
                    <Check size={14} />
                    Confirm this session
                  </Button>
                )}
                {spark.status === "BLOCKED" && (
                  <Button asChild variant="outline" className="spaced-top">
                    <Link href={`/unlock/${id}`}>
                      Find a replacement <ArrowRight size={14} />
                    </Link>
                  </Button>
                )}
                {!["CANCELLED", "COMPLETED"].includes(spark.status) && (
                  <Button
                    variant="ghost"
                    className="full-width"
                    style={{ marginTop: 10 }}
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancel session
                  </Button>
                )}
              </>
            )}
            {!ready && !confirmed && (
              <p className="group-note">
                The confirm button becomes available only after every required
                approval is received.
              </p>
            )}
          </div>
          <div className="info-note">
            <h3>
              <LockKeyhole size={16} />
              Consent isn’t optional.
            </h3>
            Mathematically feasible, proposed, accepted, and confirmed are four
            different states. A live session is only confirmed in a database
            transaction after availability and all approvals are checked again.
          </div>
        </aside>
      </div>
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this session?"
      >
        <p>
          The session will be cancelled and its resource reservations released.
          Participants can discover a different plan.
        </p>
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => void action("cancel")}
        >
          Cancel session
        </Button>
      </Modal>
    </>
  );
}
