import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone-state">
      <span className="eyebrow">404 · A WRONG TURN</span>
      <h1>
        There’s a place for you.
        <br />
        Just not on this page.
      </h1>
      <p>This Spark may have moved or belongs to a private community.</p>
      <Link className="button button-primary" href="/dashboard">
        Back to your neighbourhood →
      </Link>
    </main>
  );
}
