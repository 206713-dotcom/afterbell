"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Circle,
  Edit3,
  Flag,
  MapPin,
  ShieldCheck,
  Trash2,
  UserRoundX,
  Users,
  Zap,
} from "lucide-react";
import { useApp } from "./store";
import { ActivityArt, CategoryIcon } from "./visuals";
import { Button } from "./ui/button";
import { Badge, Empty, Loading, Modal, Status } from "./shared";
import { dateLabel, timeLabel } from "@/lib/utils";
import { SparkForm } from "./spark-form";
import { AdministrationPanel } from "./offers";
import { canReadSpark } from "@/lib/communities";
import { SparkPlace } from "./places";
export function SparkDetail({
  id,
  edit = false,
}: {
  id: string;
  edit?: boolean;
}) {
  const router = useRouter();
  const { state, loading, demo, mutate, notify } = useApp();
  const [reportOpen, setReportOpen] = useState(false),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [requested, setRequested] = useState(false),
    [deleteOpen, setDeleteOpen] = useState(false);
  if (loading) return <Loading />;
  const spark = state.sparks.find((s) => s.id === id);
  if (!spark || !canReadSpark(state, spark))
    return (
      <Empty
        title="This Spark is in another little corner."
        description="It may belong to a private hub you haven't joined, or it may have been removed."
        action={false}
      />
    );
  const owner = spark.ownerId === state.profile.id;
  const requestPending =
    requested ||
    state.participationRequests?.some(
      (r) =>
        r.sparkId === id &&
        r.userId === state.profile.id &&
        r.status === "pending",
    );
  if (edit && owner) return <SparkForm existing={spark} />;
  const proposal = state.proposals.find((p) => p.sparkId === id);
  async function request() {
    setBusy(true);
    try {
      await mutate("join", { id });
      setRequested(true);
      notify(
        "Your participation request is saved. The organizer must approve it.",
      );
    } catch {
    } finally {
      setBusy(false);
    }
  }
  async function report() {
    setBusy(true);
    try {
      await mutate("report", { id, reason });
      setReportOpen(false);
      setReason("");
      notify("Your concern has been recorded for moderator review.");
    } catch {
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    try {
      await mutate("deleteSpark", { id });
      router.push("/explore");
    } catch {
      setDeleteOpen(false);
    }
  }
  return (
    <>
      <Link href="/explore" className="back-link">
        <ArrowLeft size={14} />
        Back to possibilities
      </Link>
      <div className="detail-grid">
        <div>
          <div className="detail-cover">
            <ActivityArt category={spark.category} />
          </div>
          <div className="detail-heading">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className={`category-label category-${spark.category}`}>
                <CategoryIcon category={spark.category} size={15} />
                {spark.category}
              </span>
              <Status status={spark.status} />
              {spark.hubId && (
                <Badge>
                  <ShieldCheck size={10} />
                  Private hub
                </Badge>
              )}
            </div>
            <h1>{spark.title}</h1>
            <div className="card-meta">
              <span>
                <MapPin size={15} />
                {spark.city}
              </span>
              <span>
                <CalendarDays size={15} />
                {dateLabel(spark.windows[0].start)}
              </span>
              <span>
                <Users size={15} />
                {spark.participantIds.length}/{spark.target} people
              </span>
            </div>
          </div>
          <SparkPlace spark={spark} />
          <section className="detail-description">
            <h2>A little about the plan.</h2>
            <p>{spark.description}</p>
            {spark.subject && (
              <p>
                <b>{spark.subject}</b> ·{" "}
                {spark.academicLevel ?? "General learning"}
              </p>
            )}
            {spark.learningGoals && (
              <p>
                <b>Learning goals:</b> {spark.learningGoals}
              </p>
            )}
            {spark.category === "badminton" && (
              <p>
                <b>Game format:</b> {spark.gameMode ?? "casual"}
              </p>
            )}
          </section>
          <section className="detail-description">
            <h2>The pieces that make it possible.</h2>
            <div className="requirement-list">
              <div className="requirement-item">
                <span style={{ background: "#edf4e4", color: "#71954e" }}>
                  <Check size={16} />
                </span>
                <div>
                  <b>{spark.participantIds.length} people already connected</b>
                  <small>Out of {spark.target} needed to make it happen.</small>
                </div>
              </div>
              {spark.requirements.map((r) => (
                <div className="requirement-item" key={r.id}>
                  <span>
                    {["CONFIRMED", "COMPLETED"].includes(spark.status) ? (
                      <Check size={16} />
                    ) : (
                      <Circle size={15} />
                    )}
                  </span>
                  <div>
                    <b>
                      {r.quantity} {r.skill ?? ""} {r.kind}
                      {r.quantity > 1 ? "s" : ""}
                    </b>
                    <small>
                      {["CONFIRMED", "COMPLETED"].includes(spark.status)
                        ? "Approved and confirmed"
                        : "A little connection could fill this gap."}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="detail-description">
            <h2>A time that could work.</h2>
            {spark.windows.map((w) => (
              <div className="key-value" key={w.start}>
                <span>{dateLabel(w.start)}</span>
                <b>
                  {timeLabel(w.start)}–{timeLabel(w.end)} MYT
                </b>
              </div>
            ))}
          </section>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReportOpen(true)}
            >
              <Flag size={13} />
              Report a concern
            </Button>
            {!owner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void mutate("block", { id: spark.ownerId })
                    .then(() =>
                      notify(
                        "Block preference saved. This account is excluded from discovery and matching.",
                      ),
                    )
                    .catch(() => {})
                }
              >
                <UserRoundX size={13} />
                {state.blocked.includes(spark.ownerId)
                  ? "Unblock organizer"
                  : "Block organizer"}
              </Button>
            )}
            {owner && (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/sparks/${id}/edit`}>
                    <Edit3 size={13} />
                    Edit Spark
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 size={13} />
                  Delete Spark
                </Button>
              </>
            )}
          </div>
        </div>
        <aside className="detail-side">
          <div className="side-panel">
            <span className="eyebrow">A LITTLE CLOSER TO “SEE YOU THERE”</span>
            <h3>
              {["CONFIRMED", "COMPLETED"].includes(spark.status)
                ? "A good thing, happening."
                : "Let's make this happen."}
            </h3>
            <div className="progress-track">
              <span
                style={{
                  width: `${Math.min((spark.participantIds.length / spark.target) * 100, 100)}%`,
                }}
              />
            </div>
            <p>
              {spark.participantIds.length} of {spark.target} people connected
            </p>
            <div className="side-divider" />
            <div className="key-value">
              <span>Skill or level</span>
              <b>{spark.skill || "Everyone welcome"}</b>
            </div>
            <div className="key-value">
              <span>Total budget</span>
              <b>
                {spark.budget ? `Up to RM ${spark.budget}` : "No cost budgeted"}
              </b>
            </div>
            <div className="key-value">
              <span>Community</span>
              <b>
                {spark.hubId
                  ? (state.hubs.find((h) => h.id === spark.hubId)?.name ??
                    "Private hub")
                  : "Public · adults only"}
              </b>
            </div>
            {spark.status === "DRAFT" && owner ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void mutate("publishSpark", { id })
                    .then(() =>
                      notify(
                        "Your Spark is published. Find the missing pieces with UNLOCK.",
                      ),
                    )
                    .catch(() => {})
                    .finally(() => setBusy(false));
                }}
              >
                Publish Spark <ArrowRight size={15} />
              </Button>
            ) : owner || demo ? (
              <Button asChild variant="secondary">
                <Link href={`/unlock/${id}`}>
                  <Zap size={15} />
                  {proposal
                    ? "See the UNLOCK proposal"
                    : "Find the missing pieces"}
                </Link>
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={
                  busy ||
                  requestPending ||
                  spark.participantIds.includes(state.profile.id) ||
                  ["CONFIRMED", "COMPLETED", "CANCELLED"].includes(spark.status)
                }
                onClick={() => void request()}
              >
                {requestPending
                  ? "Request sent"
                  : busy
                    ? "Saving request…"
                    : "I'd love to join"}
                <ArrowRight size={15} />
              </Button>
            )}
            {proposal && (
              <Button asChild variant="outline">
                <Link href={`/groups/${id}`}>
                  Open the session room <ArrowRight size={14} />
                </Link>
              </Button>
            )}
            <div className="safety-detail">
              <ShieldCheck size={16} />
              No automatic commitments. Every person and resource owner gives
              their own approval.
            </div>
          </div>
          <div className="info-note">
            <h3>
              <ShieldCheck size={16} />
              Good company, with care.
            </h3>
            <p>
              Use an appropriate community venue. Keep personal details private.
              Contact moderators if something doesn’t feel right.
            </p>
            {demo && (
              <p>
                Demo Data: all people and plans are fictional. No venue booking
                is connected.
              </p>
            )}
          </div>
        </aside>
      </div>
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Let's look out for each other."
      >
        <p>
          Share the concern. This report will be visible to authorized
          moderators and your account.
        </p>
        <div className="field">
          <label htmlFor="report-reason">What should a moderator know?</label>
          <textarea
            id="report-reason"
            minLength={10}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => void report()}
          disabled={busy || reason.trim().length < 10}
        >
          Submit concern <Flag size={14} />
        </Button>
      </Modal>
      {owner && <AdministrationPanel sparkId={id} />}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Remove this little Spark?"
      >
        <p>
          Delete this activity and its proposal. Confirmed activities must first
          be cancelled in the session room.
        </p>
        <Button variant="danger" onClick={() => void remove()}>
          Delete Spark <Trash2 size={14} />
        </Button>
      </Modal>
    </>
  );
}
