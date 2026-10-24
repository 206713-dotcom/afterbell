"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Heart,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useApp } from "./store";
import { Brand } from "./visuals";
import { Button } from "./ui/button";
import { Badge, ErrorMessage, Loading, Modal, PageHeading } from "./shared";
import { cities, profileSchema } from "@/lib/validation";
import type { Profile } from "@/lib/types";
import { AdministrationPanel, OffersPanel } from "./offers";
import { AccountStatus } from "./account-status";
const interestOptions = [
  "Badminton",
  "Study",
  "Tutoring",
  "Coding",
  "Design",
  "Community",
  "Volunteering",
];
const availabilityOptions = [
  "Weekday mornings",
  "Weekday afternoons",
  "Weekday evenings",
  "Weekend mornings",
  "Weekend afternoons",
  "Weekend evenings",
];
const subjectOptions = [
  "Maths",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Computer Science",
  "Economics",
];
function ChipGroup({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  label: string;
}) {
  return (
    <div className="field">
      <span className="field-label" id={`${label}-label`}>
        {label}
      </span>
      <div
        className="check-group"
        role="group"
        aria-labelledby={`${label}-label`}
      >
        {options.map((option) => (
          <button
            type="button"
            key={option}
            aria-pressed={value.includes(option)}
            className={`check-chip ${value.includes(option) ? "selected" : ""}`}
            onClick={() =>
              onChange(
                value.includes(option)
                  ? value.filter((x) => x !== option)
                  : [...value, option],
              )
            }
          >
            {value.includes(option) && <Check size={13} />} {option}
          </button>
        ))}
      </div>
    </div>
  );
}
export function Onboarding() {
  const { state, loading } = useApp();
  if (loading) return <Loading />;
  return (
    <AccountStatus standalone>
      <PreferencesForm initial={state.profile} onboarding />
    </AccountStatus>
  );
}
export function PreferencesForm({
  initial,
  onboarding = false,
}: {
  initial: Profile;
  onboarding?: boolean;
}) {
  const { mutate, notify, demo, state } = useApp();
  const router = useRouter();
  const [data, setData] = useState(initial),
    [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setData((d) => ({ ...d, [key]: value }));
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (onboarding && step < 2) {
      if (step === 0 && data.name.trim().length < 2) {
        setError(
          "Tell us what you'd like to be called (at least two characters).",
        );
        return;
      }
      if (step === 1 && !data.interests.length) {
        setError("Choose at least one thing you're interested in.");
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    const result = profileSchema.safeParse(data);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await mutate("profile", result.data);
      notify("Your preferences are saved.");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={onboarding ? "onboarding" : ""}>
      {onboarding && (
        <>
          <div className="onboarding-brand">
            <Link href="/">
              <Brand />
            </Link>
            <Badge tone="green">
              {demo ? "Demo onboarding" : "Your community starts here"}
            </Badge>
          </div>
          <div className="step-progress" aria-label={`Step ${step + 1} of 3`}>
            {[0, 1, 2].map((s) => (
              <span className={s <= step ? "done" : ""} key={s} />
            ))}
          </div>
          <span className="eyebrow">{step + 1} OF 3 · A LITTLE ABOUT YOU</span>
          <h1>
            {
              [
                "First, the basics.",
                "What do you enjoy?",
                "When can you join?",
              ][step]
            }
          </h1>
          <p>
            {
              [
                "Choose a name and a broad area. Your exact location stays private.",
                "Choose the interests and subjects you want to explore with others.",
                "Add the times that usually work for you. You can update them later.",
              ][step]
            }
          </p>
        </>
      )}
      <form className="form-card" onSubmit={save}>
        <ErrorMessage message={error} />
        {(!onboarding || step === 0) && (
          <>
            <div className="field">
              <label htmlFor="display-name">What should we call you?</label>
              <input
                id="display-name"
                required
                minLength={2}
                maxLength={60}
                value={data.name}
                onChange={(e) => update("name", e.target.value)}
                autoComplete="nickname"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="profile-city">Your city or district</label>
                <select
                  id="profile-city"
                  value={data.city}
                  onChange={(e) => update("city", e.target.value)}
                >
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="age-category">Age category</label>
                <select
                  id="age-category"
                  value={data.age}
                  onChange={(e) =>
                    update("age", e.target.value as Profile["age"])
                  }
                  disabled={!demo && initial.onboarded}
                >
                  <option value="adult">18 or above</option>
                  <option value="youth">Under 18</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="profile-school">
                Your school or university (optional)
              </label>
              <select
                id="profile-school"
                value={data.schoolHubId ?? ""}
                onChange={(e) => update("schoolHubId", e.target.value || null)}
              >
                <option value="">Choose later</option>
                {(state.schoolDirectory ?? []).map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name} · {school.city}
                  </option>
                ))}
              </select>
              <small>
                Choose an existing school community. Membership approval is
                required before its chat opens.{" "}
                <Link href="/schools">Find or set up your school</Link>
              </small>
            </div>
            {data.age === "youth" && (
              <div className="info-note">
                <h3>
                  <ShieldCheck size={16} />A space made for students.
                </h3>
                Under-18 accounts only access approved, moderated,
                invitation-only school or organization hubs. Public adult
                matching and direct messaging are unavailable.
              </div>
            )}
          </>
        )}
        {(!onboarding || step === 1) && (
          <>
            <ChipGroup
              options={interestOptions}
              value={data.interests}
              onChange={(v) => update("interests", v)}
              label="Your interests"
            />
            <ChipGroup
              options={subjectOptions}
              value={data.subjects}
              onChange={(v) => update("subjects", v)}
              label="Subjects you're into"
            />
            {data.interests.includes("Badminton") && (
              <div className="field">
                <label htmlFor="experience">
                  On the badminton court, you’re…
                </label>
                <select
                  id="experience"
                  value={data.experience}
                  onChange={(e) => update("experience", e.target.value)}
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
            )}
          </>
        )}
        {(!onboarding || step === 2) && (
          <>
            <ChipGroup
              options={availabilityOptions}
              value={data.availability}
              onChange={(v) => update("availability", v)}
              label="Generally free around"
            />
            <ChipGroup
              options={
                data.age === "youth"
                  ? ["Approved school hubs"]
                  : ["Public communities", "Private hubs"]
              }
              value={data.communityTypes}
              onChange={(v) => update("communityTypes", v)}
              label="Your kind of community"
            />
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={data.discoverable}
                onChange={(e) => update("discoverable", e.target.checked)}
              />
              <span>
                {data.age === "adult"
                  ? "Let other adults find my display name, city and interests in connection suggestions. Friend requests and invitations need my approval."
                  : "Suggest activities within my approved school communities. Joining a plan still needs my approval."}
              </span>
            </label>
            <ChipGroup
              options={[
                "Weekly study circles",
                "Weekend games",
                "School projects",
                "Skill sharing",
                "Volunteer activities",
              ]}
              value={data.preferredActivities ?? []}
              onChange={(v) => update("preferredActivities", v)}
              label="Plans you’d like to make"
            />
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={data.hubDirectoryVisible ?? false}
                onChange={(e) =>
                  update("hubDirectoryVisible", e.target.checked)
                }
              />
              <span>
                Show my display name, city, interests and subjects to approved
                members of my communities. Administrators can identify members
                for moderation. My email stays private.
              </span>
            </label>
          </>
        )}
        <div className="form-actions">
          {onboarding && step > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft size={15} />
              Back
            </Button>
          ) : (
            <span className="subtle">
              <LockKeyhole
                size={13}
                style={{ display: "inline", marginRight: 5 }}
              />
              Your location stays broad.
            </span>
          )}
          <Button variant="secondary" disabled={busy}>
            {busy
              ? "Saving…"
              : onboarding && step < 2
                ? "Keep going"
                : onboarding
                  ? "Find your people"
                  : "Save preferences"}
            <ArrowRight size={15} />
          </Button>
        </div>
      </form>
    </div>
  );
}
export function ProfilePage() {
  const { state, loading, demo } = useApp();
  if (loading) return <Loading />;
  return (
    <>
      <PageHeading
        eyebrow="Your profile"
        title="Make this space yours."
        description="Choose your interests, add your school and set the times that work for you."
      />
      <div className="profile-header">
        <span className="avatar avatar-green">{state.profile.name[0]}</span>
        <div>
          <h1>{state.profile.name}</h1>
          <p className="subtle">
            {state.profile.city} ·{" "}
            {demo ? "Fictional demo profile" : "Community member"}
          </p>
        </div>
      </div>
      <div className="form-layout">
        <PreferencesForm initial={state.profile} />
        <aside className="info-note form-aside">
          <h3>
            <Heart size={17} />
            Make yourself at home.
          </h3>
          <p>
            Your display name and broad city help adult community members
            connect. Your email, age category, and exact location are never in a
            public directory.
          </p>
          <p>
            For young people, profiles stay inside approved school hubs. Adults
            can opt out of suggestions below.
          </p>
          {state.profile.age === "adult" && (
            <div className="spaced-top">
              <h3>Your nearby profile</h3>
              <p>
                Your public area listing is a separate, optional choice. Manage
                your intro and choose whether to appear to nearby adult members.
              </p>
              <Button asChild variant="outline" className="spaced-top">
                <Link href="/nearby">
                  Manage nearby profile <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          )}
        </aside>
      </div>
      <OffersPanel />
    </>
  );
}
export function Settings() {
  const { state, demo, loading, mutate, notify } = useApp();
  const [resetOpen, setResetOpen] = useState(false),
    [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  async function reset() {
    setBusy(true);
    try {
      await mutate("reset");
      setResetOpen(false);
      notify("Your demo is fresh again. Let's make something happen.");
    } catch {
    } finally {
      setBusy(false);
    }
  }
  function exportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            profile: state.profile,
            nearbySettings: state.nearbySettings,
            sparks: state.sparks.filter((s) => s.ownerId === state.profile.id),
            proposals: state.proposals,
            reports: state.reports,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "afterbell-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
    notify("Your data export is ready.");
  }
  return (
    <>
      <PageHeading
        eyebrow="CARE IS PART OF THE COMMUNITY"
        title="Your space. Your choices."
        description="A few simple settings to keep your community comfortable."
      />
      <div className="settings-stack">
        <AdministrationPanel />
        <div className="form-card">
          <div className="settings-row">
            <div>
              <h3>Discoverability & matching preferences</h3>
              <p>
                Control suggestion opt-in, your city, interests, and
                availability. Every invitation still needs your explicit
                approval.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/profile">
                Edit preferences <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
        </div>
        <div className="form-card">
          <div className="settings-row">
            <div>
              <h3>Your data belongs to you.</h3>
              <p>
                Download the profile, Sparks, and proposal data available to
                your account as JSON. Private data from other members is
                excluded.
              </p>
            </div>
            <Button variant="outline" onClick={exportData}>
              <Download size={15} />
              Export my data
            </Button>
          </div>
        </div>
        <div className="form-card">
          <h2>Community care & moderation</h2>
          {state.accountMode === "local" && (
            <div className="info-note spaced-top">
              <h3>Your local account</h3>
              <p>
                Account data is stored on this server. Email delivery and
                verification require the Supabase setup. Use your recovery key
                to reset a forgotten password.
              </p>
              {state.platformAdmin && (
                <p>
                  This installation’s first account has the local platform
                  administrator role. Review community requests below and
                  approve student access only after checking the school and its
                  moderators.
                </p>
              )}
            </div>
          )}
          <p>
            Reports go to authorized administrators. In the demo, you can
            simulate the moderation review.
          </p>
          {state.reports.length ? (
            state.reports.map((report) => (
              <div className="moderation-item" key={report.id}>
                <ShieldCheck size={18} />
                <p>
                  {report.reason}
                  <br />
                  <small>{report.status}</small>
                </p>
                {(demo ||
                  state.platformAdmin ||
                  state.hubs.some(
                    (h) =>
                      h.admin &&
                      state.sparks.some(
                        (s) => s.id === report.sparkId && s.hubId === h.id,
                      ),
                  )) &&
                  report.status === "open" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void mutate("resolveReport", { id: report.id })
                          .then(() => notify("Report reviewed and resolved."))
                          .catch(() => {})
                      }
                    >
                      {demo ? "Simulate review" : "Resolve report"}
                    </Button>
                  )}
              </div>
            ))
          ) : (
            <p className="subtle">
              No reports visible to your account. Use “Report a concern” on an
              activity if something doesn’t feel right.
            </p>
          )}
          <div className="divider" />
          <h3>Blocked accounts</h3>
          {state.blocked.length ? (
            state.blocked.map((id) => (
              <div className="moderation-item" key={id}>
                <p>Account · {id.slice(0, 12)}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void mutate("block", { id }).catch(() => {})}
                >
                  Unblock
                </Button>
              </div>
            ))
          ) : (
            <p className="subtle spaced-top">
              No blocked accounts. Blocking excludes a person from your
              discovery and matching suggestions.
            </p>
          )}
        </div>
        <div className="form-card">
          <div className="settings-row">
            <div>
              <h3>Private by design.</h3>
              <p>
                No unrestricted direct messaging. No precise public locations.
                Under-18 accounts stay in approved private school hubs.
                Verification labels require a real approval process.
              </p>
            </div>
            <ShieldCheck size={28} style={{ color: "#789e55" }} />
          </div>
        </div>
        {demo && (
          <div className="form-card danger-zone">
            <div className="settings-row">
              <div>
                <h3>Start the demo again.</h3>
                <p>
                  Clear this browser’s fictional activities, proposals,
                  responses, and preferences. This cannot affect a live Supabase
                  account.
                </p>
              </div>
              <Button variant="danger" onClick={() => setResetOpen(true)}>
                <RotateCcw size={15} />
                Reset demo
              </Button>
            </div>
          </div>
        )}
      </div>
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="A fresh little start?"
      >
        <p>
          This clears your local demo changes and restores the fictional
          scenarios. Your next run of UNLOCK will use the original inputs.
        </p>
        <div className="action-buttons">
          <Button variant="danger" disabled={busy} onClick={() => void reset()}>
            <Trash2 size={14} />
            {busy ? "Resetting…" : "Reset this demo"}
          </Button>
          <Button variant="outline" onClick={() => setResetOpen(false)}>
            Keep my changes
          </Button>
        </div>
      </Modal>
    </>
  );
}
