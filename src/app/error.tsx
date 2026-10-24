"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone-state">
      <h1>Let’s try that connection again.</h1>
      <p>Something interrupted this page. Your saved data is still there.</p>
      <Button onClick={reset}>Try again</Button>
      <Link href="/dashboard">Back to your neighbourhood</Link>
    </main>
  );
}
