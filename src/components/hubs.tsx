"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Globe2,
  KeyRound,
  LockKeyhole,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "./store";
import {
  ActivityCard,
  Badge,
  Empty,
  ErrorMessage,
  Loading,
  Modal,
  PageHeading,
} from "./shared";
import { Button } from "./ui/button";
import { cities, hubSchema } from "@/lib/validation";
import { AdministrationPanel } from "./offers";
import { CommunityMembers } from "./community-members";
import { ChatPanel } from "./social";
import {
  canReadHub,
  canReadSpark,
  hubKinds,
  cityStates,
} from "@/lib/communities";
import type { Category, HubKind } from "@/lib/types";
export function Hubs({
  initialCreateSchool = false,
}: {
  initialCreateSchool?: boolean;
}) {
  const { loading } = useApp();
  return loading ? (
    <Loading />
  ) : (
    <HubsLoaded initialCreateSchool={initialCreateSchool} />
  );
}
function HubsLoaded({ initialCreateSchool }: { initialCreateSchool: boolean }) {
  const { state, loading, demo, mutate, notify } = useApp();
  const [query, setQuery] = useState(""),
    [view, setView] = useState("all"),
    [kindFilter, setKindFilter] = useState("all"),
    [region, setRegion] = useState("all"),
    [activity, setActivity] = useState("all"),
    [kind, setKind] = useState<HubKind>(
      initialCreateSchool ? "school" : "community",
    ),
    [hubCategory, setHubCategory] = useState<Category>("community"),
    [city, setCity] = useState("all"),
    [createOpen, setCreateOpen] = useState(
      initialCreateSchool && state.profile.age === "adult",
    ),
    [inviteOpen, setInviteOpen] = useState(false),
    [code, setCode] = useState(""),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [hubCity, setHubCity] = useState(state.profile.city),
    [visibility, setVisibility] = useState<"public" | "private">("private"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  const hubs = state.hubs.filter(
    (h) =>
      ((h.visibility === "public" && state.profile.age === "adult") ||
        state.joined.includes(h.id)) &&
      (view !== "mine" || state.joined.includes(h.id)) &&
      (view !== "schools" || ["school", "university"].includes(h.kind ?? "")) &&
      (view !== "public" || h.visibility === "public") &&
      (kindFilter === "all" || h.kind === kindFilter) &&
      (activity === "all" || h.category === activity) &&
      (region === "all" || cityStates[h.city] === region) &&
      (city === "all" || city === h.city) &&
      `${h.name} ${h.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function redeem(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await mutate("redeem", { code });
      setInviteOpen(false);
      notify(
        "Access requested. A hub administrator must approve your membership.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    const result = hubSchema.safeParse({
      name,
      description,
      city: hubCity,
      visibility,
      category: hubCategory,
      kind,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await mutate("createHub", result.data);
      setCreateOpen(false);
      notify(
        "Hub created privately. Public listing and school approval require administrator review.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="FIND YOUR CORNER"
        title="Your people have a place."
        description="From your school circle to your weekend club. Find a space that feels like you."
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="outline"
            onClick={() => {
              setInviteOpen(true);
              setError("");
            }}
          >
            <KeyRound size={14} />
            Join with a code
          </Button>
          {state.profile.age === "adult" && (
            <Button
              variant="secondary"
              onClick={() => {
                setCreateOpen(true);
                setError("");
              }}
            >
              <Plus size={14} />
              Create a hub
            </Button>
          )}
        </div>
      </PageHeading>
      <nav className="community-shortcuts" aria-label="Your people">
        <Link href="/schools">
          <span>🎓</span>
          <div>
            <b>Find your school</b>
            <small>Classmates, activities and a shared common room</small>
          </div>
          <ArrowRight size={17} />
        </Link>
        <Link href="/connections">
          <span>✳</span>
          <div>
            <b>Friends & connections</b>
            <small>Say hello and stay in touch</small>
          </div>
          <ArrowRight size={17} />
        </Link>
      </nav>
      <div className="community-tabs" role="group" aria-label="Community view">
        {[
          ["all", "All communities"],
          ["mine", "My communities"],
          ["schools", "My schools"],
          ["public", "Public discovery"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={view === id}
            className={view === id ? "active" : ""}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {!!state.memberships?.some((m) => m.status === "pending") && (
        <div className="info-note spaced-top">
          <h3>Membership requests</h3>
          {state.memberships
            .filter((m) => m.status === "pending")
            .map((m) => (
              <p key={m.hubId}>{m.name} · awaiting community approval</p>
            ))}
        </div>
      )}
      <div className="filter-toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search communities"
            placeholder="Search a school, club or community…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          className="input"
          aria-label="Community city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="all">Across Malaysia</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Community state"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="all">All states</option>
          {[...new Set(Object.values(cityStates))].sort().map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Community kind"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
        >
          <option value="all">All types</option>
          {Object.entries(hubKinds).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Community activity"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
        >
          <option value="all">All activities</option>
          <option value="study">Study</option>
          <option value="tutoring">Peer tutoring</option>
          <option value="badminton">Badminton</option>
          <option value="community">Community</option>
        </select>
      </div>
      <div className="hub-grid">
        {hubs.length ? (
          hubs.map((h) => (
            <article className="hub-card" key={h.id}>
              <Link
                href={`/hubs/${h.id}`}
                className="hub-cover"
                tabIndex={-1}
                aria-hidden="true"
              >
                <span className="hub-monogram">
                  {h.name
                    .split(" ")
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                {h.visibility === "private" ? (
                  <LockKeyhole size={65} />
                ) : (
                  <Globe2 size={65} />
                )}
              </Link>
              <div className="hub-card-body">
                <div style={{ marginBottom: 13 }}>
                  <Badge>{hubKinds[h.kind ?? "community"]}</Badge>
                  <Badge tone={h.visibility === "private" ? "blue" : "green"}>
                    {h.visibility === "private" ? (
                      <LockKeyhole size={10} />
                    ) : (
                      <Globe2 size={10} />
                    )}{" "}
                    {h.visibility === "private"
                      ? "Invitation only"
                      : "Public · adults"}
                  </Badge>
                  {!h.approved && <Badge tone="amber">Awaiting approval</Badge>}
                </div>
                <Link href={`/hubs/${h.id}`}>
                  <h3>{h.name}</h3>
                </Link>
                <p>{h.description}</p>
                <div className="hub-stats">
                  <span>
                    <MapPin
                      size={12}
                      style={{ display: "inline", marginRight: 4 }}
                    />
                    {h.city}
                  </span>
                  <span>
                    {h.members} {demo ? "demo " : ""}members
                  </span>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/hubs/${h.id}`}>
                    {state.joined.includes(h.id)
                      ? "Your community"
                      : "Explore community"}
                    <ArrowRight size={13} />
                  </Link>
                </Button>
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="Your community is taking shape."
            description="Join an approved hub with an invitation code, or create a little corner of your own."
            action={false}
          />
        )}
      </div>
      <div className="bottom-banner">
        <ShieldCheck size={24} style={{ color: "#729451" }} />
        <div>
          <h3>Different circles. The same sense of belonging.</h3>
          <p>
            Public communities are for adults. Under-18 accounts only access
            approved, moderated, invitation-only hubs.
          </p>
        </div>
      </div>
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="A little invitation goes a long way."
      >
        <p>
          Enter the invite code shared by your school or organization.
          Administrators review membership before private information becomes
          accessible.
        </p>
        {demo && (
          <div className="info-note" style={{ marginBottom: 17 }}>
            Fictional demo codes: <b>MERANTI-DEMO</b> and <b>BAYU-DEMO</b>. Each
            school has its own membership and private activities.
          </div>
        )}
        <form onSubmit={redeem}>
          <ErrorMessage message={error} />
          <div className="field">
            <label htmlFor="invite-code">Invitation code</label>
            <input
              id="invite-code"
              required
              maxLength={80}
              value={code}
              onChange={(e) => setCode(e.target.value.trim().toUpperCase())}
              placeholder="Your hub's invite code"
            />
          </div>
          <Button variant="secondary" disabled={busy}>
            {busy ? "Requesting…" : "Request hub access"}
            <ArrowRight size={14} />
          </Button>
        </form>
      </Modal>
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Make a little corner of your own."
      >
        <form onSubmit={create}>
          <ErrorMessage message={error} />
          <div className="field-row">
            <div className="field">
              <label htmlFor="hub-kind">What kind of community?</label>
              <select
                id="hub-kind"
                value={kind}
                onChange={(e) => {
                  const value = e.target.value as HubKind;
                  setKind(value);
                  if (["school", "university"].includes(value))
                    setVisibility("private");
                }}
              >
                {Object.entries(hubKinds).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="hub-activity">Main activity</label>
              <select
                id="hub-activity"
                value={hubCategory}
                onChange={(e) => setHubCategory(e.target.value as Category)}
              >
                <option value="community">Community activities</option>
                <option value="study">Study circles</option>
                <option value="tutoring">Peer tutoring</option>
                <option value="badminton">Badminton</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="hub-name">Community name</label>
            <input
              id="hub-name"
              required
              minLength={4}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="hub-description">What brings you together?</label>
            <textarea
              id="hub-description"
              required
              minLength={20}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="hub-city">City</label>
              <select
                id="hub-city"
                value={hubCity}
                onChange={(e) => setHubCity(e.target.value)}
              >
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="hub-visibility">Community type</label>
              <select
                id="hub-visibility"
                disabled={["school", "university"].includes(kind)}
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as "public" | "private")
                }
              >
                <option value="private">Private, invitation only</option>
                <option value="public">Public adult community</option>
              </select>
            </div>
          </div>
          <p>
            New hubs require administrator approval before public discovery or
            youth access. Hub creators become hub administrators; youth access
            is never self-approved.
          </p>
          <Button variant="secondary" disabled={busy}>
            {busy ? "Creating…" : "Create your hub"}
            <Plus size={14} />
          </Button>
        </form>
      </Modal>
    </>
  );
}
export function HubDetail({
  id,
  initialTab = "activities",
}: {
  id: string;
  initialTab?: string;
}) {
  const { state, demo, loading, mutate, notify } = useApp();
  const [busy, setBusy] = useState(false),
    [tab, setTab] = useState(initialTab === "chat" ? "chat" : "activities");
  if (loading) return <Loading />;
  const hub = state.hubs.find((h) => h.id === id);
  if (!hub || !canReadHub(state, hub))
    return (
      <Empty
        title="A private little corner."
        description="Use an invitation code to request membership. Your school’s activities are visible after approval."
        action={false}
      />
    );
  const joined = state.joined.includes(id),
    manager = hub.admin || hub.role === "organizer";
  const sparks = state.sparks.filter(
    (a) => a.hubId === id && a.status !== "DRAFT" && canReadSpark(state, a),
  );
  async function request() {
    setBusy(true);
    try {
      await mutate("join", { id });
      notify("Membership requested. A community administrator will review it.");
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link href="/hubs" className="back-link">
        <ArrowLeft size={14} />
        Your communities
      </Link>
      <header className="hub-hero">
        <span className="hub-monogram">
          {hub.name
            .split(" ")
            .map((x) => x[0])
            .slice(0, 2)
            .join("")}
        </span>
        <div>
          <div className="member-tags">
            <Badge tone={hub.visibility === "private" ? "blue" : "green"}>
              {hub.visibility === "private" ? (
                <LockKeyhole size={12} />
              ) : (
                <Globe2 size={12} />
              )}
              {hub.visibility === "private"
                ? "Private community"
                : "Public · adults"}
            </Badge>
            <Badge>{hubKinds[hub.kind ?? "community"]}</Badge>
            {!hub.approved && (
              <Badge tone="amber">Awaiting platform approval</Badge>
            )}
          </div>
          <h1>{hub.name}</h1>
          <p>{hub.description}</p>
          <p>
            {hub.city} · {hub.members} {demo ? "fictional " : ""}members
            {joined
              ? " · Your role: " +
                (hub.role === "hub_admin"
                  ? "Administrator"
                  : (hub.role ?? "Member"))
              : ""}
          </p>
        </div>
      </header>
      {!joined ? (
        <div className="form-card">
          <h2>Make room for good company.</h2>
          <p>
            Request membership to participate. Private school activities and
            directories are for approved members.
          </p>
          {hub.visibility === "public" && (
            <Button
              variant="secondary"
              disabled={busy || hub.pending}
              onClick={() => void request()}
            >
              {hub.pending ? "Request pending review" : "Request to join"}
              <ArrowRight size={14} />
            </Button>
          )}
        </div>
      ) : (
        <>
          <div
            className="community-tabs"
            role="group"
            aria-label="Community sections"
          >
            {[
              ["activities", "Activities"],
              ["members", "Members"],
              ...(hub.approved
                ? [
                    [
                      "chat",
                      ["school", "university"].includes(hub.kind ?? "")
                        ? "School chat"
                        : "Community chat",
                    ],
                  ]
                : []),
              ...(manager ? [["manage", "Manage community"]] : []),
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={tab === id}
                className={tab === id ? "active" : ""}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "activities" && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Good plans start here.</h2>
                  <p>Activities shared in {hub.name}.</p>
                </div>
                {hub.approved && (
                  <Button asChild variant="secondary" size="sm">
                    <Link href={"/sparks/create?hub=" + id}>
                      <Plus size={14} />
                      Start a Spark
                    </Link>
                  </Button>
                )}
              </div>
              <div className="activity-grid">
                {sparks.length ? (
                  sparks.map((a) => <ActivityCard spark={a} key={a.id} />)
                ) : (
                  <Empty
                    title="Your next good plan could start here."
                    description="Create a study circle, a game, or a community project for this group."
                    action={false}
                  />
                )}
              </div>
            </>
          )}
          {tab === "members" && (
            <>
              <div className="members-connect-link">
                <p>Want to stay in touch with people from your community?</p>
                <Link href="/connections" className="text-link">
                  Friends & connections <ArrowRight size={15} />
                </Link>
              </div>
              <CommunityMembers hub={hub} />
            </>
          )}
          {tab === "chat" && hub.approved && (
            <ChatPanel
              hubId={id}
              title={
                ["school", "university"].includes(hub.kind ?? "")
                  ? "School common room"
                  : "Community common room"
              }
            />
          )}
          {tab === "manage" && manager && (
            <>
              <CommunityMembers hub={hub} />
              <AdministrationPanel hubId={id} />
            </>
          )}
          <div className="info-note spaced-top">
            <ShieldCheck size={20} />
            <h3>A community with care built in.</h3>
            <p>
              {hub.youthApproved
                ? "Approved, moderated school community. Peer tutors need individual approval. Students stay out of public people discovery."
                : "Every invitation needs consent. Community roles control membership, resources, and moderation."}
            </p>
          </div>
        </>
      )}
    </>
  );
}
