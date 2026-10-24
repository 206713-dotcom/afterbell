"use client";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Box,
  Check,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useApp } from "./store";
import { Badge, ErrorMessage, Modal } from "./shared";
import { Button } from "./ui/button";
import type { RequirementKind } from "@/lib/types";
export function OffersPanel() {
  const { state, mutate, notify } = useApp();
  const [open, setOpen] = useState(false),
    [label, setLabel] = useState(""),
    [kind, setKind] = useState<RequirementKind>("participant"),
    [hubId, setHubId] = useState(""),
    [subject, setSubject] = useState(""),
    [capacity, setCapacity] = useState(8),
    [date, setDate] = useState("2026-10-24"),
    [start, setStart] = useState("09:00"),
    [end, setEnd] = useState("16:00"),
    [racket, setRacket] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const offers = state.candidates.filter(
    (c) => c.ownerId === state.profile.id && c.optedIn,
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (end <= start) {
      setError("Choose an end time after your start time.");
      return;
    }
    if ((state.profile.age === "youth" || kind === "tutor") && !hubId) {
      setError("An approved private hub is required for this offer.");
      return;
    }
    setBusy(true);
    try {
      await mutate("offer", {
        label,
        kind,
        city: state.profile.city,
        hubId: hubId || null,
        skills: subject
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        quantity: 1,
        capacity: kind === "participant" || kind === "tutor" ? 1 : capacity,
        cost: 0,
        needs:
          racket && kind === "participant"
            ? [{ id: "racket", kind: "racket", quantity: 1 }]
            : [],
        windows: [
          {
            start: `${date}T${start}:00+08:00`,
            end: `${date}T${end}:00+08:00`,
          },
        ],
      });
      setOpen(false);
      setLabel("");
      notify(
        kind === "tutor"
          ? "Peer tutoring offer saved. A hub administrator must approve your tutor role."
          : "Your offer is saved. You'll still approve every individual commitment.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="form-card spaced-top">
      <div className="section-heading">
        <div>
          <h2>A little something you can bring.</h2>
          <p>
            Opt in to participation or resource suggestions. Each commitment
            still needs your yes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} />
          Add an offer
        </Button>
      </div>
      {offers.length ? (
        offers.map((c) => (
          <div className="moderation-item" key={c.id}>
            <Box size={17} />
            <p>
              <b>{c.label}</b>
              <br />
              {c.kind} · {c.city} ·{" "}
              {c.hubId ? "Private hub" : "Adult public matching"}
              <br />
              {!c.approved && <Badge tone="amber">Approval required</Badge>}
            </p>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Withdraw ${c.label}`}
              onClick={() =>
                void mutate("removeOffer", { id: c.id })
                  .then(() => notify("Offer withdrawn from new suggestions."))
                  .catch(() => {})
              }
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))
      ) : (
        <p className="subtle">
          A spare racket. Your time. A room you manage. You might have the
          missing piece for someone’s plan.
        </p>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="What could you bring to the plan?"
      >
        <form onSubmit={submit}>
          <ErrorMessage message={error} />
          <div className="field">
            <label htmlFor="offer-label">A name for your offer</label>
            <input
              id="offer-label"
              required
              minLength={3}
              maxLength={100}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Alex's spare racket"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="offer-kind">I can offer…</label>
              <select
                id="offer-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as RequirementKind)}
              >
                {(
                  [
                    "participant",
                    "tutor",
                    "racket",
                    "room",
                    "venue",
                    "facilitator",
                    "projector",
                  ] as const
                ).map((k) => (
                  <option key={k} value={k}>
                    {k === "participant"
                      ? "My participation"
                      : k[0].toUpperCase() + k.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="offer-hub">Community</label>
              <select
                id="offer-hub"
                value={hubId}
                onChange={(e) => setHubId(e.target.value)}
              >
                <option
                  value=""
                  disabled={kind === "tutor" || state.profile.age === "youth"}
                >
                  {kind === "tutor" || state.profile.age === "youth"
                    ? "Choose an approved private hub"
                    : "Public adults"}
                </option>
                {state.hubs
                  .filter(
                    (h) =>
                      h.approved &&
                      state.joined.includes(h.id) &&
                      (kind !== "tutor" || h.visibility === "private"),
                  )
                  .map((h) => (
                    <option value={h.id} key={h.id}>
                      {h.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="offer-skills">
              Skills or subjects (comma separated)
            </label>
            <input
              id="offer-skills"
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="intermediate, Maths, Physics"
            />
            <small>
              Use the exact expertise requested by a Spark. Tutor skills still
              require administrator approval.
            </small>
          </div>
          {!["participant", "tutor"].includes(kind) && (
            <div className="field">
              <label htmlFor="offer-capacity">
                People this resource can support
              </label>
              <input
                id="offer-capacity"
                type="number"
                min={1}
                max={100}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="offer-date">Available date (Malaysia time)</label>
            <input
              id="offer-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="offer-start">Available from</label>
              <input
                id="offer-start"
                type="time"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="offer-end">Available until</label>
              <input
                id="offer-end"
                type="time"
                required
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          {kind === "participant" && (
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={racket}
                onChange={(e) => setRacket(e.target.checked)}
              />
              I’d need to borrow a racket to participate.
            </label>
          )}
          <div className="info-note spaced-top">
            <ShieldCheck
              size={15}
              style={{ display: "inline", marginRight: 7 }}
            />
            I own or manage this offer, and consent to receiving suggestions for
            this time and community. I will approve each session separately.
            Once confirmed, your offer is reserved for that session.
          </div>
          <Button variant="secondary" disabled={busy} className="spaced-top">
            {busy ? "Saving…" : "Make this offer available"}
            <ArrowRight size={14} />
          </Button>
        </form>
      </Modal>
    </section>
  );
}
export function AdministrationPanel({
  hubId,
  sparkId,
}: {
  hubId?: string;
  sparkId?: string;
}) {
  const { state, demo, mutate, notify } = useApp();
  const membership = (state.membershipRequests ?? []).filter(
    (m) =>
      m.status === "pending" &&
      (!hubId || m.hubId === hubId) &&
      state.hubs.some(
        (h) => h.id === m.hubId && (h.admin || h.role === "organizer"),
      ),
  );
  const participation = (state.participationRequests ?? []).filter(
    (r) =>
      r.status === "pending" &&
      (!sparkId || r.sparkId === sparkId) &&
      state.sparks.some(
        (s) =>
          s.id === r.sparkId &&
          s.ownerId === state.profile.id &&
          (!hubId || s.hubId === hubId),
      ),
  );
  const hubs = state.platformAdmin ? state.hubs.filter((h) => !h.approved) : [];
  const tutorOffers = state.candidates.filter(
    (c) =>
      c.kind === "tutor" &&
      !c.approved &&
      (!hubId || c.hubId === hubId) &&
      state.hubs.some((h) => h.id === c.hubId && (h.admin || demo)),
  );
  const resourceApprovals = state.candidates.filter(
    (c) =>
      c.kind !== "tutor" &&
      !c.approved &&
      c.hubId &&
      (!hubId || c.hubId === hubId) &&
      state.hubs.some((h) => h.id === c.hubId && (h.admin || demo)),
  );
  if (
    !membership.length &&
    !participation.length &&
    !hubs.length &&
    !tutorOffers.length &&
    !resourceApprovals.length
  )
    return null;
  return (
    <section className="form-card spaced-top">
      <h2>Keep your little community moving.</h2>
      <p>
        Review requests using the organizer or administrator role assigned to
        your account.
      </p>
      {membership.map((m) => (
        <div className="moderation-item" key={`${m.hubId}-${m.userId}`}>
          <p>
            Membership request · {m.userId.slice(0, 8)}
            <br />
            {state.hubs.find((h) => h.id === m.hubId)?.name}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void mutate("approve", {
                id: m.hubId,
                userId: m.userId,
                accept: true,
              })
                .then(() => notify("Membership approved."))
                .catch(() => {})
            }
          >
            <Check size={13} />
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void mutate("approve", {
                id: m.hubId,
                userId: m.userId,
                accept: false,
              }).catch(() => {})
            }
          >
            Decline
          </Button>
        </div>
      ))}
      {participation.map((r) => (
        <div className="moderation-item" key={r.id}>
          <p>
            Participation request · {r.userId.slice(0, 8)}
            <br />
            {state.sparks.find((s) => s.id === r.sparkId)?.title}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void mutate("approveParticipation", { id: r.id, accept: true })
                .then(() =>
                  notify(
                    "Participation approved. Re-run UNLOCK to update remaining requirements.",
                  ),
                )
                .catch(() => {})
            }
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void mutate("approveParticipation", {
                id: r.id,
                accept: false,
              }).catch(() => {})
            }
          >
            Decline
          </Button>
        </div>
      ))}
      {hubs.map((h) => (
        <div className="moderation-item" key={h.id}>
          <p>
            {h.name}
            <br />
            {h.visibility} · Awaiting platform review
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void mutate("approveHub", {
                id: h.id,
                youthApproved: false,
              }).catch(() => {})
            }
          >
            Approve hub
          </Button>
          {h.visibility === "private" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void mutate("approveHub", {
                  id: h.id,
                  youthApproved: true,
                }).catch(() => {})
              }
            >
              Approve as moderated school
            </Button>
          )}
        </div>
      ))}
      {tutorOffers.map((c) => (
        <div className="moderation-item" key={c.id}>
          <p>
            {c.label}
            <br />
            Tutor expertise: {c.skills.join(", ")}. Verify through your school’s
            process before approving.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void mutate("approveTutor", {
                id: c.hubId,
                userId: c.ownerId,
                approved: true,
              })
                .then(() => notify("Peer tutor approved inside this hub."))
                .catch(() => {})
            }
          >
            Approve peer tutor
          </Button>
        </div>
      ))}
      {resourceApprovals.map((c) => (
        <div className="moderation-item" key={c.id}>
          <p>
            {c.label}
            <br />
            Confirm that this resource is managed by this member and approved
            for your hub.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void mutate("approveOffer", { id: c.id })
                .then(() => notify("Resource approved for this hub."))
                .catch(() => {})
            }
          >
            Approve resource
          </Button>
        </div>
      ))}
    </section>
  );
}
