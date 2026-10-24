"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  MapPin,
  Plus,
  Users,
  Zap,
} from "lucide-react";
import { useApp } from "./store";
import { ActivityCard, Empty, Loading } from "./shared";
import { CategoryIcon } from "./visuals";
import { MyPlans, NextMoves } from "./my-plans";
import { discover, matchReasons } from "@/lib/discovery";
import { personalPlans, planHref, planWindow } from "@/lib/plans";
import { dateLabel, timeLabel } from "@/lib/utils";
import { Button } from "./ui/button";

export function Dashboard() {
  const { state, loading } = useApp();
  const [now] = useState(() => Date.now());
  if (loading) return <Loading />;
  const recommended = discover(state, {
    category: "all",
    query: "",
    city: "all",
    saved: false,
    date: "",
    time: "any",
    needsPeople: false,
    sort: "recommended",
  }).slice(0, 2);
  const confirmed = personalPlans(state, "confirmed").sort(
    (a, b) =>
      Date.parse(planWindow(state, a).start) -
      Date.parse(planWindow(state, b).start),
  );
  const next = confirmed.find(
    (s) => Date.parse(planWindow(state, s).end) >= now,
  );
  const joined = state.hubs.filter((h) => state.joined.includes(h.id));
  const drafts = personalPlans(state, "drafts");
  return (
    <div className="home-page">
      <div className="greeting-header">
        <div>
          <span className="eyebrow">
            Your space · {state.profile.city || "Malaysia"}
          </span>
          <h1>
            Good to see you, {state.profile.name.split(" ")[0]}.{" "}
            <span className="greeting-star" aria-hidden="true">
              ✳
            </span>
          </h1>
          <p>Your next game, study session or shared idea starts here.</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/sparks/create">
            <Plus size={17} />
            Create a Spark
          </Link>
        </Button>
      </div>
      <section className="home-overview" aria-label="Your week at a glance">
        <div className="home-overview-intro">
          <span className="eyebrow">Make time for what matters</span>
          <h2>
            Good company.
            <br />
            <em>Better plans.</em>
          </h2>
          <p>
            A study session, a game after class, or something entirely new.
            Start with what you enjoy.
          </p>
          <Link href="/explore">
            Discover your next plan <ArrowRight size={17} />
          </Link>
          <span className="home-overview-star" aria-hidden="true">
            ✳
          </span>
        </div>
        <div className="home-overview-personal">
          {next ? (
            <Link className="next-session" href={planHref(state, next)}>
              <span className="eyebrow">
                <span className="status-dot" />
                Your next confirmed plan
              </span>
              <h3>{next.title}</h3>
              <p>
                <CalendarDays size={15} />
                {dateLabel(planWindow(state, next).start)} ·{" "}
                {timeLabel(planWindow(state, next).start)} MYT
              </p>
              <p>
                <MapPin size={15} />
                {next.city}
              </p>
              <span className="text-link">
                Open session <ArrowRight size={16} />
              </span>
            </Link>
          ) : (
            <div className="next-session">
              <span className="eyebrow">
                <CalendarDays size={16} />
                Your next good plan
              </span>
              <h3>A little space for something you’ll love.</h3>
              <p>
                Join an activity or start your own. Your confirmed plans will
                appear here.
              </p>
              <Link href="/explore" className="text-link">
                Explore activities <ArrowRight size={16} />
              </Link>
            </div>
          )}
          <div className="personal-shortcuts">
            {[
              {
                href: "/plans",
                label: "Active plans",
                value: personalPlans(state, "active").length,
                icon: CalendarDays,
              },
              {
                href: "/plans?view=saved",
                label: "Saved",
                value: personalPlans(state, "saved").length,
                icon: Bookmark,
              },
              {
                href: "/hubs",
                label: "Communities",
                value: joined.length,
                icon: Users,
              },
            ].map(({ href, label, value, icon: Icon }) => (
              <Link href={href} key={href}>
                <Icon size={17} />
                <b>{value}</b>
                <span>{label}</span>
                <ArrowRight size={14} />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <div className="home-workspace">
        <div className="home-priorities">
          <NextMoves />
          <MyPlans />
          {drafts.length > 0 && (
            <Link className="resume-drafts" href="/plans?view=drafts">
              <span>
                <b>
                  {drafts.length === 1
                    ? "One idea waiting for you"
                    : `${drafts.length} ideas waiting for you`}
                </b>
                <small>Your drafts are private until you publish them.</small>
              </span>
              <span>
                Continue a draft <ArrowRight size={16} />
              </span>
            </Link>
          )}
        </div>
        <aside className="home-discover" aria-label="Find your people">
          <div className="home-discover-panel">
            <span className="eyebrow">Make time for your thing</span>
            <h2>What’s your plan?</h2>
            <p>Start with something you enjoy.</p>
            <nav className="intent-grid" aria-label="Find an activity">
              {[
                {
                  href: "/study",
                  category: "study" as const,
                  title: "Study together",
                  text: "Find your focus",
                },
                {
                  href: "/tutoring",
                  category: "tutoring" as const,
                  title: "Find a peer tutor",
                  text: "Find a peer tutor",
                },
                {
                  href: "/badminton",
                  category: "badminton" as const,
                  title: "Play badminton",
                  text: "Find your next game",
                },
                {
                  href: "/hubs",
                  category: "community" as const,
                  title: "Find your people",
                  text: "Schools, clubs & more",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`intent-${item.category}`}
                >
                  <span className="intent-icon">
                    <CategoryIcon category={item.category} size={25} />
                  </span>
                  <b>{item.title}</b>
                  <small>{item.text}</small>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </nav>
          </div>
          <section className="home-communities">
            <div className="section-heading">
              <h2>Your communities</h2>
              <Link href="/hubs" className="text-link">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {joined.length ? (
              joined.slice(0, 3).map((h) => (
                <Link href={`/hubs/${h.id}`} key={h.id} className="mini-hub">
                  <span>
                    {h.name
                      .split(" ")
                      .map((x) => x[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <b>{h.name}</b>
                    <small>
                      {h.visibility === "private"
                        ? "Private community"
                        : h.city}
                    </small>
                  </div>
                  <ArrowRight size={15} />
                </Link>
              ))
            ) : (
              <div className="home-community-empty">
                <Users size={24} />
                <p>
                  Your school, club or next circle of friends could be here.
                </p>
                <Link href="/hubs" className="text-link">
                  Find a community <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </section>
        </aside>
      </div>
      <section
        className="home-recommendations"
        aria-labelledby="recommended-plans-title"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">Picked for you</span>
            <h2 id="recommended-plans-title">Your next plan starts here.</h2>
            <p>
              A game, a study session, a reason to get together. See what fits.
            </p>
          </div>
          <Link href="/explore" className="text-link">
            Browse all plans <ArrowRight size={15} />
          </Link>
        </div>
        <div className="activity-grid home-recommendation-grid">
          {recommended.length ? (
            recommended.map((s) => (
              <ActivityCard
                key={s.id}
                spark={s}
                reasons={matchReasons(s, state.profile)}
                featured
              />
            ))
          ) : (
            <Empty
              title="Your next plan could bring people together."
              description="Start a Spark for something you’d love to do, or find a community to join."
            />
          )}
        </div>
      </section>
      <nav className="home-help-links" aria-label="More ways to connect">
        {state.profile.age === "adult" && (
          <Link href="/nearby">
            <span className="help-link-icon">
              <MapPin size={23} />
            </span>
            <div>
              <span className="home-help-label">Around your area</span>
              <h3>Find your people nearby</h3>
              <p>
                Explore shared interests around{" "}
                {state.profile.city || "your area"}.
              </p>
            </div>
            <ArrowRight size={19} />
          </Link>
        )}
        <Link href="/unlock">
          <span className="help-link-icon">
            <Zap size={23} />
          </span>
          <div>
            <span className="home-help-label">Make it possible</span>
            <h3>Give your plan a way forward</h3>
            <p>
              UNLOCK can help find a missing player, resource or shared time.
            </p>
          </div>
          <ArrowRight size={19} />
        </Link>
      </nav>
      <div className="home-impact-link">
        <p>Small plans add up to a more connected community.</p>
        <Link href="/impact" className="text-link">
          See community impact <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
