"use client";
import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Users } from "lucide-react";
import { useApp } from "./store";
import { Badge, ErrorMessage } from "./shared";
import { Button } from "./ui/button";
import { safeDirectory } from "@/lib/community-actions";
import type { Hub, HubInvite, HubMember } from "@/lib/types";

export function CommunityMembers({ hub }: { hub: Hub }) {
  const { state, demo, mutate, notify } = useApp();
  const [data, setData] = useState<{
    members: HubMember[];
    invites: HubInvite[];
  }>({ members: [], invites: [] });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [code, setCode] = useState(""),
    [revision, setRevision] = useState(0);
  const [checkedAt] = useState(() => Date.now());
  const manager = hub.admin || hub.role === "organizer";
  useEffect(() => {
    if (demo) return;
    let active = true;
    fetch(`/api/hubs/${hub.id}`, { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        if (active) setData(json);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [hub.id, demo, revision]);
  const members = demo ? safeDirectory(state, hub.id) : data.members;
  const invites = demo
    ? (state.hubInvites?.filter((i) => i.hubId === hub.id) ?? [])
    : data.invites;
  async function manage(action: string, userId: string, role?: string) {
    setBusy(true);
    setError("");
    try {
      await mutate("communityManage", { id: hub.id, action, userId, role });
      setRevision((r) => r + 1);
      notify("Community membership updated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function invite() {
    setBusy(true);
    setError("");
    try {
      if (demo) {
        setCode(hub.id === "school-hub" ? "MERANTI-DEMO" : "BAYU-DEMO");
        notify(
          "Fictional example invitation. Real account invitations are generated per community.",
        );
        return;
      }
      const r = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hubId: hub.id }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error);
      setCode(json.code);
      setRevision((r) => r + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="form-card spaced-top"
      aria-labelledby="community-members-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR SHARED SPACE</span>
          <h2 id="community-members-title">
            <Users size={20} /> People in this community
          </h2>
          <p>
            Approved members only. Names and interests appear when a member opts
            in; administrators can identify members to manage requests.
          </p>
        </div>
        {manager && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void invite()}
          >
            <KeyRound size={15} /> Create invitation code
          </Button>
        )}
      </div>
      <ErrorMessage message={error} />
      {code && (
        <div className="recovery-card">
          <b>Your invitation code</b>
          <code>{code}</code>
          <p>
            Share privately with one intended member. Expires in seven days,
            single use. Membership still needs approval.
            {demo
              ? " This is a fictional demo code."
              : " This code is shown only now."}
          </p>
        </div>
      )}
      <div className="member-grid">
        {members.map((m) => (
          <article className="member-card" key={m.userId}>
            <div className="member-heading">
              <span className="avatar avatar-green">{m.name[0]}</span>
              <div>
                <b>{m.name}</b>
                <p>
                  {m.role === "hub_admin"
                    ? "Community administrator"
                    : m.role === "organizer"
                      ? "Organizer"
                      : "Member"}
                </p>
              </div>
            </div>
            <div className="member-tags">
              <Badge tone={m.status === "approved" ? "green" : "amber"}>
                {m.status}
              </Badge>
              {m.tutorApproved && (
                <Badge tone="blue">Approved peer tutor</Badge>
              )}
              {m.userId === state.profile.id && <Badge>You</Badge>}
              {hub.ownerId === m.userId && <Badge>Owner</Badge>}
            </div>
            <p className="subtle">
              {m.interests.length
                ? m.interests.join(" · ")
                : "Profile details are private."}
            </p>
            {manager && m.status === "pending" && (
              <div className="action-buttons">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void manage("approve", m.userId)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void manage("reject", m.userId)}
                >
                  Decline
                </Button>
              </div>
            )}
            {hub.admin &&
              m.status === "approved" &&
              m.userId !== state.profile.id &&
              m.userId !== hub.ownerId && (
                <div className="member-controls">
                  <label>
                    Community role
                    <select
                      className="input"
                      aria-label={`Role for ${m.name}`}
                      value={m.role}
                      disabled={busy}
                      onChange={(e) =>
                        void manage("role", m.userId, e.target.value)
                      }
                    >
                      <option value="member">Member</option>
                      <option value="organizer">Organizer</option>
                      <option value="hub_admin">Administrator</option>
                    </select>
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void manage("remove", m.userId)}
                  >
                    Remove membership
                  </Button>
                  {hub.ownerId === state.profile.id &&
                    m.role === "hub_admin" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void manage("transfer", m.userId)}
                      >
                        Transfer ownership
                      </Button>
                    )}
                </div>
              )}
          </article>
        ))}
      </div>
      {!members.length && (
        <p className="subtle">
          The community directory is loading or has no visible members yet.
        </p>
      )}
      {manager && !!invites.length && (
        <details className="spaced-top">
          <summary>Invitation history · {invites.length}</summary>
          {invites.map((i) => (
            <p key={i.id} className="subtle">
              {i.used
                ? "Used"
                : Date.parse(i.expiresAt) <= checkedAt
                  ? "Expired"
                  : "Available"}{" "}
              · expires{" "}
              {new Date(i.expiresAt).toLocaleDateString("en-MY", {
                timeZone: "Asia/Kuala_Lumpur",
              })}
            </p>
          ))}
        </details>
      )}
      <p className="subtle spaced-top">
        <ShieldCheck size={14} /> Manage your directory visibility in your
        profile. Student details never appear in the public nearby directory.
      </p>
    </section>
  );
}
