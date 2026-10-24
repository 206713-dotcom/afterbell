"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useApp } from "./store";
import { Button } from "./ui/button";
import { ErrorMessage, Loading, PageHeading } from "./shared";
import { cities, sparkSchema } from "@/lib/validation";
import type { Category, RequirementKind, Spark } from "@/lib/types";
import { academicLevels } from "@/lib/communities";
import { venueById, venueForCategory } from "@/lib/venues";
import { VenuePicker } from "./places";
import {
  initialActivityCategory,
  tomorrowInMalaysia,
} from "@/lib/activity-defaults";
export function SparkCreate({
  initialHubId,
  initialVenueId,
  initialCategory,
}: {
  initialHubId?: string;
  initialVenueId?: string;
  initialCategory?: string;
}) {
  const { loading } = useApp();
  return loading ? (
    <Loading />
  ) : (
    <SparkForm
      initialHubId={initialHubId}
      initialVenueId={initialVenueId}
      initialCategory={initialCategory}
    />
  );
}
function inputTime(value: string | undefined, fallback: string) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kuala_Lumpur",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(value))
    : fallback;
}
export function SparkForm({
  existing,
  initialHubId,
  initialVenueId,
  initialCategory,
}: {
  existing?: Spark;
  initialHubId?: string;
  initialVenueId?: string;
  initialCategory?: string;
}) {
  const { state, mutate, notify, demo } = useApp(),
    router = useRouter();
  const initialVenue = venueById(initialVenueId);
  const chosenCategory =
    existing?.category ??
    initialVenue?.kind ??
    initialActivityCategory(initialCategory) ??
    "badminton";
  const [title, setTitle] = useState(existing?.title ?? ""),
    [description, setDescription] = useState(existing?.description ?? ""),
    [category, setCategory] = useState<Category>(chosenCategory),
    [subject, setSubject] = useState(existing?.subject ?? "Maths"),
    [academicLevel, setAcademicLevel] = useState(
      existing?.academicLevel ?? "General learning",
    ),
    [learningGoals, setLearningGoals] = useState(existing?.learningGoals ?? ""),
    [gameMode, setGameMode] = useState<"singles" | "doubles" | "casual">(
      existing?.gameMode ?? "casual",
    ),
    [venueId, setVenueId] = useState(
      existing?.venueId ?? initialVenue?.id ?? "",
    ),
    [spaceLabel, setSpaceLabel] = useState(existing?.spaceLabel ?? ""),
    [bookingStatus, setBookingStatus] = useState<"planned" | "booked">(
      existing?.bookingStatus ?? "planned",
    ),
    [bookingReference, setBookingReference] = useState(
      existing?.bookingReference ?? "",
    ),
    [city, setCity] = useState(
      existing?.city ??
        initialVenue?.city ??
        state.hubs.find((h) => h.id === initialHubId)?.city ??
        state.profile.city,
    ),
    [hubId, setHubId] = useState(
      existing?.hubId ??
        initialHubId ??
        (state.profile.age === "youth" || chosenCategory === "tutoring"
          ? (state.hubs.find(
              (h) =>
                h.approved &&
                h.visibility === "private" &&
                (state.profile.age === "adult" || h.youthApproved) &&
                state.joined.includes(h.id),
            )?.id ?? "")
          : ""),
    ),
    [target, setTarget] = useState(existing?.target ?? 4),
    [skill, setSkill] = useState(
      existing?.requirements.find(
        (r) => r.kind === "participant" || r.kind === "tutor",
      )?.skill ??
        existing?.skill ??
        (["study", "tutoring"].includes(chosenCategory)
          ? "Maths"
          : chosenCategory === "community"
            ? "All levels"
            : "Intermediate"),
    ),
    [budget, setBudget] = useState(existing?.budget ?? 0),
    [day, setDay] = useState(
      existing?.windows[0]?.start
        ? new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kuala_Lumpur",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(existing.windows[0].start))
        : demo
          ? "2026-10-24"
          : tomorrowInMalaysia(),
    ),
    [start, setStart] = useState(
      inputTime(existing?.windows[0]?.start, "09:00"),
    ),
    [end, setEnd] = useState(inputTime(existing?.windows[0]?.end, "11:00")),
    [alternate, setAlternate] = useState((existing?.windows.length ?? 0) > 1),
    [resources, setResources] = useState<RequirementKind[]>(
      existing?.requirements
        .filter((r) => !["participant", "tutor"].includes(r.kind))
        .map((r) => r.kind) ?? [],
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  function resetBooking() {
    setBookingStatus("planned");
    setBookingReference("");
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const toIso = (time: string) => `${day}T${time}:00+08:00`;
    const data = {
      draft:
        (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
        "draft",
      subject: ["study", "tutoring"].includes(category) ? subject : "",
      academicLevel,
      learningGoals: ["study", "tutoring"].includes(category)
        ? learningGoals
        : "",
      gameMode: category === "badminton" ? gameMode : "casual",
      venueId:
        venueById(venueId) && venueForCategory(venueById(venueId)!, category)
          ? venueId || null
          : null,
      spaceLabel: venueId ? spaceLabel : "",
      bookingStatus: venueId ? bookingStatus : "planned",
      bookingReference: venueId ? bookingReference : "",
      title,
      description,
      category,
      city,
      hubId: hubId || null,
      target,
      skill,
      budget,
      windows: [
        { start: toIso(start), end: toIso(end) },
        ...(alternate ? [{ start: toIso("14:00"), end: toIso("16:00") }] : []),
      ],
      requirements: [
        {
          id: "people",
          kind: category === "tutoring" ? "tutor" : "participant",
          quantity:
            category === "tutoring"
              ? 1
              : Math.max(
                  1,
                  target -
                    (existing?.participantIds.length ?? 1) -
                    (resources.includes("facilitator") ? 1 : 0),
                ),
          ...(["tutoring", "study"].includes(category)
            ? { skill: skill || "Maths" }
            : category === "badminton" && skill.toLowerCase() !== "all levels"
              ? { skill: skill.toLowerCase().replace(/ friendly$/, "") }
              : {}),
        },
        ...resources
          .filter(
            (kind) =>
              bookingStatus !== "booked" || !["room", "venue"].includes(kind),
          )
          .map((kind) => ({
            id: kind,
            kind,
            quantity: 1,
            ...(kind === "room" || kind === "venue"
              ? { capacity: target }
              : {}),
          })),
      ],
    };
    const result = sparkSchema.safeParse(data);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await mutate(existing ? "updateSpark" : "createSpark", {
        ...result.data,
        ...(existing ? { id: existing.id } : {}),
      });
      notify(
        data.draft
          ? "Your draft is saved. Only you can see it."
          : existing && existing.status !== "DRAFT"
            ? "Your Spark has been updated."
            : "Your Spark is published. Let’s find your people.",
      );
      router.push(
        existing
          ? `/sparks/${existing.id}`
          : data.draft
            ? "/dashboard"
            : "/explore",
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        href={
          existing?.status === "DRAFT"
            ? "/plans?view=drafts"
            : existing
              ? `/sparks/${existing.id}`
              : "/plans"
        }
        className="back-link"
      >
        <ArrowLeft size={14} />
        {existing?.status === "DRAFT"
          ? "Back to your drafts"
          : existing
            ? "Back to the plan"
            : "Back to your plans"}
      </Link>
      <PageHeading
        eyebrow="From an idea to a plan"
        title={
          existing ? "Make your plan even better." : "Bring your plan to life."
        }
        description="Share what you want to do, when you’re free and what you still need. Save a draft or publish it when you’re ready."
      />
      <div className="form-layout">
        <form className="form-card" onSubmit={submit}>
          <ErrorMessage message={error} />
          <div className="field">
            <label htmlFor="spark-title">Give it a name</label>
            <input
              id="spark-title"
              required
              minLength={8}
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="One more for Saturday doubles?"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="category">Your kind of thing</label>
              <select
                id="category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as Category);
                  setVenueId("");
                  setSpaceLabel("");
                  resetBooking();
                  setSkill(
                    e.target.value === "tutoring" || e.target.value === "study"
                      ? "Maths"
                      : e.target.value === "badminton"
                        ? "Intermediate"
                        : "All levels",
                  );
                  if (e.target.value === "tutoring" && !hubId)
                    setHubId(
                      state.hubs.find(
                        (h) =>
                          h.visibility === "private" &&
                          h.approved &&
                          state.joined.includes(h.id),
                      )?.id ?? "",
                    );
                }}
              >
                <option value="badminton">Badminton</option>
                <option value="study">Study circle</option>
                <option value="tutoring">Peer tutoring</option>
                <option value="community">Community activity</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="spark-target">People needed, including you</label>
              <input
                id="spark-target"
                type="number"
                min={2}
                max={30}
                required
                readOnly={category === "badminton" && gameMode !== "casual"}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="description">Tell people a little more</label>
            <textarea
              id="description"
              minLength={20}
              maxLength={1500}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you planning? Who would enjoy joining? What would make it a good session?"
            />
          </div>
          {["study", "tutoring"].includes(category) && (
            <div className="form-section">
              <h3>Give your session a focus.</h3>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="study-subject">Subject</label>
                  <input
                    id="study-subject"
                    maxLength={60}
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      setSkill(e.target.value);
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="academic-level">Academic level</label>
                  <select
                    id="academic-level"
                    value={academicLevel}
                    onChange={(e) => setAcademicLevel(e.target.value)}
                  >
                    {academicLevels.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="learning-goals">
                  What would you like to learn?
                </label>
                <textarea
                  id="learning-goals"
                  maxLength={400}
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  placeholder="Work through quadratic equations and leave with a revision plan."
                />
              </div>
            </div>
          )}
          {category === "badminton" && (
            <div className="field">
              <label htmlFor="game-mode">Game format</label>
              <select
                id="game-mode"
                value={gameMode}
                onChange={(e) => {
                  const mode = e.target.value as typeof gameMode;
                  setGameMode(mode);
                  if (mode !== "casual") setTarget(mode === "singles" ? 2 : 4);
                }}
              >
                <option value="casual">Casual group / rotation</option>
                <option value="singles">Singles · 2 players</option>
                <option value="doubles">Doubles · 4 players</option>
              </select>
            </div>
          )}
          <div className="form-section">
            <h3>A time and a place</h3>
            {["badminton", "study", "tutoring"].includes(category) && (
              <VenuePicker
                kind={category === "badminton" ? "badminton" : "study"}
                city={city}
                value={venueId}
                onChange={(v) => {
                  setVenueId(v?.id ?? "");
                  if (v) setCity(v.city);
                  setSpaceLabel("");
                  resetBooking();
                }}
              />
            )}
            <div className="field-row">
              <div className="field">
                <label htmlFor="spark-city">City or district</label>
                <select
                  id="spark-city"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    if (venueById(venueId)?.city !== e.target.value) {
                      setVenueId("");
                      setSpaceLabel("");
                      resetBooking();
                    }
                  }}
                >
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="visibility">
                  Where should this Spark live?
                </label>
                <select
                  id="visibility"
                  value={hubId}
                  onChange={(e) => setHubId(e.target.value)}
                >
                  {state.profile.age === "adult" && category !== "tutoring" && (
                    <option value="">Public adult community</option>
                  )}
                  {state.hubs
                    .filter(
                      (h) =>
                        state.joined.includes(h.id) &&
                        h.approved &&
                        (category !== "tutoring" ||
                          h.visibility === "private") &&
                        (state.profile.age === "adult" || h.youthApproved),
                    )
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                </select>
                <small>
                  Peer tutoring and under-18 activities require an approved
                  private hub.
                </small>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="spark-date">
                  Preferred date (Malaysia time)
                </label>
                <input
                  id="spark-date"
                  type="date"
                  required
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value);
                    resetBooking();
                  }}
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="start-time">From</label>
                  <input
                    id="start-time"
                    type="time"
                    required
                    value={start}
                    onChange={(e) => {
                      setStart(e.target.value);
                      resetBooking();
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="end-time">Until</label>
                  <input
                    id="end-time"
                    type="time"
                    required
                    value={end}
                    onChange={(e) => {
                      setEnd(e.target.value);
                      resetBooking();
                    }}
                  />
                </div>
              </div>
            </div>
            {!!venueId && (
              <div className="space-booking-fields">
                <div className="field">
                  <label htmlFor="space-label">
                    {category === "badminton"
                      ? "Court number / name"
                      : "Room, table or space"}
                  </label>
                  <input
                    id="space-label"
                    value={spaceLabel}
                    maxLength={50}
                    placeholder={
                      category === "badminton"
                        ? "e.g. Court 8"
                        : "e.g. Discussion Room 2"
                    }
                    onChange={(e) => {
                      setSpaceLabel(e.target.value);
                      resetBooking();
                    }}
                  />
                  <small>
                    Use the court or room name from the venue’s calendar.
                  </small>
                </div>
                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={bookingStatus === "booked"}
                    onChange={(e) => {
                      setBookingStatus(e.target.checked ? "booked" : "planned");
                      if (e.target.checked) setAlternate(false);
                    }}
                  />
                  I have a booking confirmation from the venue
                </label>
                {bookingStatus === "booked" && (
                  <div className="field">
                    <label htmlFor="booking-reference">
                      Booking reference · private to you
                    </label>
                    <input
                      id="booking-reference"
                      value={bookingReference}
                      onChange={(e) => setBookingReference(e.target.value)}
                      maxLength={100}
                      required
                      placeholder="Reference from the venue’s confirmation"
                    />
                    <small>
                      Your group sees the court and time. This reference stays
                      private. Changing the centre or time clears the
                      confirmation record.
                    </small>
                  </div>
                )}
              </div>
            )}
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={alternate}
                disabled={bookingStatus === "booked"}
                onChange={(e) => setAlternate(e.target.checked)}
              />
              Also consider 2–4 pm that day, if it helps everyone make it.
            </label>
          </div>
          <div className="form-section">
            <h3>People, equipment & budget</h3>
            <div className="field-row">
              <div className="field">
                <label htmlFor="skill">
                  {category === "tutoring"
                    ? "Subject expertise needed"
                    : "Skill, level, or subject"}
                </label>
                <input
                  id="skill"
                  maxLength={60}
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  placeholder={
                    category === "tutoring" ? "Maths" : "Beginner friendly"
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="budget">Total optional budget (RM)</label>
                <input
                  id="budget"
                  type="number"
                  min={0}
                  max={5000}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                />
                <small>No payments are collected.</small>
              </div>
            </div>
            <div className="field">
              <span className="field-label">
                What resources are you missing?
              </span>
              <div className="check-group">
                {(
                  [
                    "racket",
                    "room",
                    "venue",
                    "facilitator",
                    "projector",
                  ] as RequirementKind[]
                ).map((r) => (
                  <label
                    className={`check-chip ${resources.includes(r) ? "selected" : ""}`}
                    key={r}
                  >
                    <input
                      type="checkbox"
                      checked={resources.includes(r)}
                      onChange={(e) =>
                        setResources(
                          e.target.checked
                            ? [...resources, r]
                            : resources.filter((x) => x !== r),
                        )
                      }
                    />
                    {r[0].toUpperCase() + r.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="form-actions">
            <span className="subtle">
              <ShieldCheck
                size={13}
                style={{ display: "inline", marginRight: 5 }}
              />
              Every invitation needs consent.
            </span>
            <Button variant="secondary" disabled={busy}>
              {busy
                ? "Saving your Spark…"
                : existing
                  ? existing.status === "DRAFT"
                    ? "Publish Spark"
                    : "Save changes"
                  : "Put your Spark out there"}
              <ArrowRight size={15} />
            </Button>
            <Button
              variant="outline"
              name="action"
              value="draft"
              disabled={busy}
            >
              Save draft
            </Button>
          </div>
        </form>
        <aside className="form-aside">
          <div className="info-note">
            <h3>
              <Lightbulb size={18} />
              Make it easy to say yes.
            </h3>
            <p>
              Say who the plan is for, what you’ll do and what people should
              bring. You can work out the remaining details together.
            </p>
            <p>
              List the people or resources you’re missing. UNLOCK can suggest a
              combination for everyone to approve.
            </p>
          </div>
          <div className="info-note spaced-top">
            <h3>
              <Zap size={17} />
              What happens next?
            </h3>
            <p>
              Your Spark becomes discoverable to eligible members. Run UNLOCK to
              search available offers and make a proposal. Nothing is reserved
              until everyone approves.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
