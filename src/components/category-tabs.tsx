"use client";
import { Compass } from "lucide-react";
import { CategoryIcon } from "./visuals";
import type { Category } from "@/lib/types";

export function CategoryTabs({
  value,
  onChange,
  counts,
}: {
  value: Category | "all";
  onChange: (value: Category | "all") => void;
  counts?: { category: Category }[];
}) {
  return (
    <div className="category-tabs" role="group" aria-label="Activity category">
      {(["all", "badminton", "study", "tutoring", "community"] as const).map(
        (category) => (
          <button
            key={category}
            className={`category-tab ${value === category ? "active" : ""}`}
            aria-pressed={value === category}
            onClick={() => onChange(category)}
          >
            {category === "all" ? (
              <Compass size={15} />
            ) : (
              <CategoryIcon category={category} size={15} />
            )}
            <span>
              {category === "all"
                ? "For you"
                : category === "study"
                  ? "Study circles"
                  : category[0].toUpperCase() + category.slice(1)}
            </span>
            {counts && (
              <span className="category-count">
                {category === "all"
                  ? counts.length
                  : counts.filter((s) => s.category === category).length}
              </span>
            )}
          </button>
        ),
      )}
    </div>
  );
}
