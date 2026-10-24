import {
  BookOpen,
  Check,
  HeartHandshake,
  Lightbulb,
  MoveUpRight,
  Plus,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import type { Category } from "@/lib/types";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-symbol">
        <span />
        <span />
        <span />
        <span />
      </span>
      afterbell<span className="brand-dot">.</span>
    </span>
  );
}
export function CategoryIcon({
  category,
  size = 18,
}: {
  category: Category;
  size?: number;
}) {
  return category === "badminton" ? (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <ellipse cx="15" cy="8" rx="5" ry="7" transform="rotate(40 15 8)" />
      <path d="m10 13-7 8m10-17 6 8M10 7l7 7m-3-11-4 8m8-7-4 9" />
    </svg>
  ) : category === "study" ? (
    <BookOpen size={size} />
  ) : category === "tutoring" ? (
    <Users size={size} />
  ) : (
    <Lightbulb size={size} />
  );
}
export function NetworkArt({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`network-art ${compact ? "network-compact" : ""}`}
      aria-label="A network of people, resources, and ideas connected through AfterBell"
      role="img"
    >
      <div className="network-grid" />
      <svg viewBox="0 0 600 390" className="network-lines" aria-hidden="true">
        <path
          d="M300 190 130 100M300 190 470 72M300 190 482 292M300 190 130 298M130 100 130 298M470 72 482 292"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="5 7"
        />
        <circle
          cx="300"
          cy="190"
          r="120"
          fill="none"
          stroke="currentColor"
          opacity=".15"
        />
        <circle
          cx="300"
          cy="190"
          r="165"
          fill="none"
          stroke="currentColor"
          opacity=".1"
        />
      </svg>
      <div className="network-center">
        <Zap size={46} fill="currentColor" />
        <span>possibility, unlocked.</span>
      </div>
      <div className="network-node node-person">
        <span className="avatar avatar-blue">H</span>
        <div>
          <b>A fourth player.</b>
          <small>Ready to join in</small>
        </div>
        <Check className="node-check" size={16} />
      </div>
      <div className="network-node node-resource">
        <span className="node-icon">
          <CategoryIcon category="badminton" size={26} />
        </span>
        <div>
          <b>A spare racket.</b>
          <small>A little goes a long way</small>
        </div>
      </div>
      <div className="network-node node-study">
        <span className="node-icon node-icon-blue">
          <BookOpen size={24} />
        </span>
        <div>
          <b>A shared ambition.</b>
          <small>Better, together</small>
        </div>
      </div>
      <div className="network-node node-spark">
        <Sparkles size={22} />
        <b>One connection changes things.</b>
        <MoveUpRight size={17} />
      </div>
      <div className="network-orbit orbit-one">
        <Plus size={16} />
      </div>
      <div className="network-orbit orbit-two">
        <HeartHandshake size={20} />
      </div>
    </div>
  );
}
export function ActivityArt({ category }: { category: Category }) {
  if (category === "badminton")
    return (
      <div className="activity-art art-court">
        <svg viewBox="0 0 400 190" fill="none" aria-hidden="true">
          <g transform="translate(80 -25) rotate(24 130 100)">
            <rect x="0" y="0" width="240" height="235" rx="3" fill="#d4eaa9" />
            <path
              d="M15 10h210v210H15zM0 115h240M15 55h210M15 180h210M120 10v210M40 10v210M200 10v210"
              stroke="#fff"
              strokeWidth="2"
            />
            <path d="M-10 114h260" stroke="#5c7852" strokeWidth="3" />
            <path d="M-10 112h260v13H-10z" fill="#fbfff5" fillOpacity=".6" />
          </g>
          <ellipse
            cx="277"
            cy="107"
            rx="28"
            ry="38"
            fill="#faf9eb"
            stroke="#173b33"
            strokeWidth="5"
            transform="rotate(35 277 107)"
          />
          <path
            d="m255 139-29 40"
            stroke="#173b33"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="m264 80 22 52m-32-35 40 21m-24-33 17 43m-26-34 30 17"
            stroke="#739575"
          />
          <path
            d="m117 65 10-18 7 17-9 9z"
            fill="white"
            stroke="#74946f"
            strokeWidth="1.5"
          />
          <circle cx="124" cy="72" r="5" fill="#173b33" />
        </svg>
        <span className="art-note">a good kind of racket.</span>
      </div>
    );
  if (category === "study" || category === "tutoring")
    return (
      <div
        className={`activity-art ${category === "study" ? "art-study" : "art-tutor"}`}
      >
        <svg viewBox="0 0 400 190" fill="none" aria-hidden="true">
          <g transform="rotate(-12 190 95)">
            <rect
              x="108"
              y="12"
              width="160"
              height="190"
              rx="7"
              fill="#fbfaf4"
              stroke="#cbc9b9"
            />
            <path d="M130 12v190" stroke="#e5b4a2" />
            <path
              d="M145 50h97M145 75h80M145 100h97M145 125h65M145 150h90"
              stroke="#b6c9d1"
              strokeWidth="2"
            />
            <path
              d="m159 55 18-25 15 28m-23-11h15M165 105l12 12 25-30"
              stroke="#557f63"
              strokeWidth="3"
            />
          </g>
          <g transform="rotate(18 250 100)">
            <rect
              x="248"
              y="25"
              width="12"
              height="140"
              rx="3"
              fill="#254a65"
            />
            <path d="m248 165 6 17 6-17" fill="#d4af80" />
          </g>
          <circle cx="88" cy="125" r="33" fill="#c2d6e0" />
          <path d="M63 125h50M88 100v50" stroke="#52748a" strokeWidth="2" />
        </svg>
        <span className="art-note">room for a little discovery.</span>
      </div>
    );
  return (
    <div className="activity-art art-community">
      <svg viewBox="0 0 400 190" fill="none" aria-hidden="true">
        <rect
          x="110"
          y="25"
          width="185"
          height="125"
          rx="10"
          fill="#fbf4e9"
          stroke="#a58b6e"
          strokeWidth="2"
        />
        <rect x="120" y="35" width="165" height="100" rx="3" fill="#233b3a" />
        <path
          d="m163 65-20 18 20 18m76-36 20 18-20 18m-27-43-19 52"
          stroke="#bce494"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="m110 150-27 17h240l-28-17" fill="#e1c7a6" stroke="#a58b6e" />
        <path d="M59 80h30v42a15 15 0 0 1-30 0z" fill="#d79870" />
        <path d="M89 87c24-3 24 28 0 22" stroke="#d79870" strokeWidth="6" />
        <path
          d="M69 66c-12-14 15-14 3-27"
          stroke="#b28568"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="art-note">small projects. big possibilities.</span>
    </div>
  );
}
