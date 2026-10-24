import { ArrowUpRight, BookOpen, Sparkles } from "lucide-react";

/** An editorial illustration, rather than a preview of real bookings or people. */
export function WelcomeArt() {
  return (
    <div
      className="welcome-art"
      role="img"
      aria-label="An illustrated badminton court and a note celebrating studying together."
    >
      <div className="welcome-court">
        <div className="welcome-court-heading">
          <span>Make time to play</span>
          <ArrowUpRight size={18} />
        </div>
        <svg viewBox="0 0 440 240" fill="none" aria-hidden="true">
          <defs>
            <linearGradient
              id="welcome-court-surface"
              x1="0"
              y1="0"
              x2="440"
              y2="240"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#648471" />
              <stop offset="1" stopColor="#3c6553" />
            </linearGradient>
          </defs>
          <rect
            x="0"
            y="0"
            width="440"
            height="240"
            rx="4"
            fill="url(#welcome-court-surface)"
          />
          <g stroke="#f5f0dc" strokeWidth="1.4" opacity=".78">
            <path d="M28 28H412V212H28zM28 43H412M28 197H412M45 28V212M395 28V212M163 28V212M277 28V212M28 120H163M277 120H412" />
            <path d="M220 20V220" strokeDasharray="3 3" opacity=".75" />
          </g>
          <ellipse
            cx="114"
            cy="87"
            rx="18"
            ry="7"
            fill="#173d2e"
            opacity=".3"
          />
          <circle cx="114" cy="79" r="13" fill="#eee3c5" />
          <circle cx="114" cy="79" r="6" fill="#7f563e" />
          <ellipse
            cx="334"
            cy="159"
            rx="18"
            ry="7"
            fill="#173d2e"
            opacity=".3"
          />
          <circle cx="334" cy="151" r="13" fill="#d9d3e6" />
          <circle cx="334" cy="151" r="6" fill="#6d5b82" />
          <path
            d="M141 69C186 26 258 51 299 113"
            stroke="#f4edcf"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            opacity=".65"
          />
          <g transform="translate(233 49) rotate(24)">
            <path d="M-6-7L6-7L3 4H-3z" fill="#fff9e8" />
            <circle cy="5" r="2.5" fill="#e9cf8c" />
          </g>
        </svg>
        <div className="welcome-court-caption">
          <p>One more game.</p>
          <span>A good way to end the day.</span>
        </div>
      </div>
      <div className="welcome-study-note">
        <span className="welcome-note-label">
          <BookOpen size={16} /> The study circle
        </span>
        <p>
          Different minds.
          <br />
          <em>Shared ambition.</em>
        </p>
        <div className="welcome-note-rule" />
        <span className="welcome-note-bottom">
          A little focus. A fresh perspective.
          <Sparkles size={17} />
        </span>
      </div>
    </div>
  );
}
