"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Globe2,
  HeartHandshake,
  LockKeyhole,
  Play,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { Brand, ActivityArt } from "./visuals";
import { ConnectionBoard } from "./connection-board";
import { Button } from "./ui/button";
import { ErrorMessage } from "./shared";
import { clearChatDrafts } from "@/lib/chat-drafts";
export function DemoButton({
  children = "Explore the demo",
  variant = "outline",
  className = "",
  destination = "/dashboard",
}: {
  children?: React.ReactNode;
  variant?: "outline" | "default" | "secondary";
  className?: string;
  destination?: "/dashboard" | "/study" | "/badminton" | "/hubs";
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function enter() {
    setBusy(true);
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      if (!res.ok) throw new Error("The demo is currently disabled.");
      clearChatDrafts();
      // Full reload clears the previous identity's React and route caches.
      window.location.assign(destination);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant={variant}
        className={className}
        disabled={busy}
        onClick={() => void enter()}
      >
        {busy ? "Opening your neighbourhood…" : children}
        {!busy && <ArrowRight size={15} />}
      </Button>
      {error && <ErrorMessage message={error} />}
    </>
  );
}
export function Landing({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <div className="landing">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="landing-nav">
        <Link href="/" aria-label="AfterBell home">
          <Brand />
        </Link>
        <nav className="landing-links" aria-label="Website navigation">
          <a href="#possibilities">Activities</a>
          <a href="#communities">Communities</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="landing-nav-actions">
          <Link href={signedIn ? "/plans" : "/auth"}>
            {signedIn ? "My plans" : "Log in"}
          </Link>
          <Button asChild variant="secondary">
            <Link href={signedIn ? "/dashboard" : "/auth?mode=register"}>
              {signedIn ? "Go to Home" : "Join AfterBell"}{" "}
              <ArrowRight size={14} />
            </Link>
          </Button>
        </div>
      </header>
      <main id="main-content">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-kicker">
              <span className="status-dot" /> Good plans start with good
              company.
            </span>
            <h1>
              Find your people.
              <br />
              <em>Make it happen.</em>
            </h1>
            <p>
              A study session. A game after class. A community that feels like
              yours. Find people across Malaysia and make your next plan
              together.
            </p>
            <div className="landing-hero-actions">
              <Button asChild variant="secondary">
                <Link href={signedIn ? "/dashboard" : "/auth?mode=register"}>
                  {signedIn ? "Back to your space" : "Find your people"}{" "}
                  <ArrowRight size={15} />
                </Link>
              </Button>
              <DemoButton>
                <Play size={13} />
                Try the live demo
              </DemoButton>
            </div>
            <div className="landing-hero-note">
              <Globe2 size={14} />
              <span>Across Malaysia · Free to join · Your own account</span>
            </div>
          </div>
          <div className="landing-visual">
            <ConnectionBoard />
            <div className="landing-visual-caption">
              <span className="status-dot" /> Shared interests. Plans worth
              making.
            </div>
          </div>
        </section>
        <div className="landing-value-strip">
          <span>
            <Users size={17} />
            Find people who share your interests.
          </span>
          <span>
            <Zap size={17} />
            Find what your plan is missing.
          </span>
          <span>
            <ShieldCheck size={17} />
            <span>Your community. Your choice.</span>
          </span>
        </div>
        <section id="possibilities" className="landing-section">
          <div className="landing-section-header">
            <div>
              <span className="eyebrow">Make more of your free time</span>
              <h2>
                Make time for
                <br />
                <em>what you love.</em>
              </h2>
            </div>
            <p>
              Build a study routine, find your next game or start something new.
              You bring the idea. Your community helps it happen.
            </p>
          </div>
          <div className="landing-category-grid">
            {(
              [
                {
                  category: "study",
                  title: "Find your study circle.",
                  text: "Share a subject, compare notes and set aside time to focus together.",
                },
                {
                  category: "badminton",
                  title: "One more for doubles?",
                  text: "Find players, choose a court and get your next game in the calendar.",
                },
                {
                  category: "community",
                  title: "Your school. Your club. Your people.",
                  text: "Keep activities, members and shared interests together in one community.",
                },
              ] as const
            ).map((x) => (
              <article key={x.category} className="landing-category-card">
                <ActivityArt category={x.category} />
                <div>
                  <span className="landing-category-label">
                    {x.category === "study"
                      ? "Study & peer learning"
                      : x.category === "badminton"
                        ? "Players, courts & shared games"
                        : "Schools, clubs & local groups"}
                  </span>
                  <h3>{x.title}</h3>
                  <p>{x.text}</p>
                  {signedIn ? (
                    <Link
                      className="text-link"
                      href={
                        x.category === "community" ? "/hubs" : `/${x.category}`
                      }
                    >
                      Explore{" "}
                      {x.category === "community" ? "communities" : x.category}
                      <ArrowRight size={14} />
                    </Link>
                  ) : (
                    <DemoButton
                      className="category-preview-button"
                      destination={
                        x.category === "community"
                          ? "/hubs"
                          : x.category === "study"
                            ? "/study"
                            : "/badminton"
                      }
                    >
                      Preview{" "}
                      {x.category === "community" ? "communities" : x.category}
                    </DemoButton>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
        <section
          id="communities"
          className="landing-communities landing-section"
        >
          <div>
            <span className="eyebrow">A place to belong</span>
            <h2>
              Your circles.
              <br />
              <em>All in one place.</em>
            </h2>
            <p>
              Keep your school life, club activities and local plans connected.
              Each community has its own members, activities and space to
              organize.
            </p>
            <Button asChild variant="secondary">
              <Link href={signedIn ? "/hubs" : "/auth?mode=register"}>
                {signedIn ? "Find a community" : "Join your community"}
                <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
          <div className="community-paths">
            <article>
              <span>
                <Users size={25} />
              </span>
              <h3>Schools & universities</h3>
              <p>
                Study circles, peer tutoring and activities with your school
                community. Student spaces use approved membership.
              </p>
              <small>Private spaces · Membership approval</small>
            </article>
            <article>
              <span>
                <Globe2 size={25} />
              </span>
              <h3>Clubs & local communities</h3>
              <p>
                Find a badminton group, share a skill or meet adults around a
                common interest.
              </p>
              <small>Shared interests · Local activities</small>
            </article>
          </div>
        </section>
        <section id="unlock-engine" className="landing-unlock">
          <div className="landing-unlock-inner">
            <div>
              <span className="eyebrow">Meet your plan’s missing link</span>
              <h2>
                A good plan.
                <br />
                <em>One missing piece.</em>
              </h2>
              <p>
                Missing a player, a spare racket or a place to meet? UNLOCK
                suggests combinations of people, resources and available times.
                Everyone approves their part before the organizer confirms.
              </p>
              <DemoButton variant="default">See UNLOCK in action</DemoButton>
              <div className="safety-detail">
                <ShieldCheck size={15} />A suggestion first. A shared yes before
                anything is confirmed.
              </div>
            </div>
            <div className="lab-canvas">
              <div className="lab-canvas-header">
                <span>
                  <Zap size={13} /> A SATURDAY GAME, UNLOCKED
                </span>
                <span>Illustration</span>
              </div>
              <div className="lab-network has-proposal">
                <svg viewBox="0 0 500 280" className="edges" aria-hidden="true">
                  <path d="M250 140 85 60M250 140 415 60M250 140 85 220M250 140 415 220" />
                </svg>
                <div className="lab-spark">
                  <Zap size={30} />
                  <b>Saturday doubles</b>
                </div>
                <div className="lab-node accepted">
                  <Users size={14} />
                  <b>3 players, ready</b>
                  <small>
                    <Check size={9} />
                    Already connected
                  </small>
                </div>
                <div className="lab-node proposed">
                  <Users size={14} />
                  <b>Meet your fourth</b>
                  <small>Invitation proposed</small>
                </div>
                <div className="lab-node proposed">
                  <HeartHandshake size={14} />
                  <b>A spare racket</b>
                  <small>Owner approval needed</small>
                </div>
                <div className="lab-node accepted">
                  <Check size={14} />
                  <b>A time that works</b>
                  <small>Saturday, 9–11 am</small>
                </div>
              </div>
              <div className="lab-legend">
                <span>
                  <i className="legend-dot legend-amber" />
                  Proposed
                </span>
                <span>
                  <i className="legend-dot legend-green" />
                  Available
                </span>
              </div>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="landing-section">
          <span className="eyebrow">From an idea to a shared plan</span>
          <h2>
            Start with “we should.”
            <br />
            End with “see you there.”
          </h2>
          <div className="landing-how-grid">
            {[
              {
                n: "01",
                title: "Start with a Spark.",
                text: "Share what you want to do, choose a time and tell people what would make it possible.",
              },
              {
                n: "02",
                title: "Connect the missing pieces.",
                text: "Find people and places, or ask UNLOCK to suggest the resources your plan still needs.",
              },
              {
                n: "03",
                title: "Agree on the plan. Show up.",
                text: "Everyone agrees to their part. Your organizer confirms, and the plan is yours to enjoy.",
              },
            ].map((x) => (
              <div key={x.n}>
                <div className="landing-how-number">STEP {x.n}</div>
                <h3>{x.title}</h3>
                <p>{x.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="landing-cta">
          <span className="eyebrow">Good company is a good start</span>
          <h2>
            Make room for
            <br />
            something worth doing.
          </h2>
          <p>
            Your next game, study session or shared idea starts with a hello.
          </p>
          <Button asChild variant="secondary">
            <Link href="/auth?mode=register">
              Join AfterBell <ArrowRight size={15} />
            </Link>
          </Button>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <p>
          A student-built foundation. Demo data is fictional. Made with Codex
          assistance.
        </p>
        <Link href="/auth" className="text-link">
          <LockKeyhole size={13} />
          Privacy & community care <ArrowRight size={12} />
        </Link>
      </footer>
    </div>
  );
}
