"use client";
import dynamic from "next/dynamic";
import { useApp } from "./store";
import { Loading, PageHeading } from "./shared";
import { ImpactSummary } from "./impact-summary";
const ImpactChart = dynamic(() => import("./impact-chart"), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 215 }} />,
});
export function ImpactPage() {
  const { demo, loading } = useApp();
  if (loading) return <Loading />;
  return (
    <>
      <PageHeading
        eyebrow="Small plans. Shared progress."
        title="Community impact"
        description="See the connections turning into shared plans across the communities you can access."
      />
      <ImpactSummary />
      <section className="impact-panel">
        <div className="section-heading">
          <h2>From ideas to shared plans</h2>
          <span className="badge badge-neutral">
            {demo ? "Demo Data" : "Your accessible community data"}
          </span>
        </div>
        <div className="form-card">
          <ImpactChart />
          <p className="chart-explanation">
            Computed from{" "}
            {demo
              ? "fictional activities in this browser"
              : "activities your account can access"}
            . A feasible proposal still needs approval. Confirmed and completed
            sessions are counted separately.
          </p>
        </div>
      </section>
    </>
  );
}
