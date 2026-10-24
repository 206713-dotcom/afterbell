"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
  MapPin,
  Search,
  X,
} from "lucide-react";
import {
  venues,
  venueById,
  venueDirections,
  venueLocality,
  providerEmbed,
  type Venue,
  type PlaceKind,
} from "@/lib/venues";
import type { Spark } from "@/lib/types";
import { Modal, PageHeading } from "./shared";
import { Button } from "./ui/button";
import { useApp } from "./store";
import { useUrlState } from "./use-url-state";

export function VenueBooking({
  venue,
  onClose,
}: {
  venue: Venue | null;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const embed = venue ? providerEmbed(venue) : null;
  return (
    <Modal
      open={!!venue}
      onClose={onClose}
      title={venue ? `${venue.name} · booking` : "Book a space"}
      className={`venue-booking-modal ${embed ? "has-scheduler" : ""}`}
    >
      {venue && (
        <>
          <p className="booking-provider-note">
            {embed
              ? "Choose your court, date and time in the venue’s booking calendar below. The provider handles availability, confirmation and payment."
              : "Continue to the venue’s website to check spaces, dates and booking options."}
          </p>
          <div className="booking-provider-actions">
            <span>
              {venue.provider === "AFA" ? "AFA Community" : venue.provider}{" "}
              booking
            </span>
            <a
              href={venue.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open booking page <ExternalLink size={14} />
            </a>
          </div>
          {embed ? (
            <div className="embedded-scheduler">
              {!loaded && <p role="status">Opening the venue’s calendar…</p>}
              <iframe
                key={venue.id}
                title={`Live booking for ${venue.name}`}
                src={embed}
                onLoad={() => setLoaded(true)}
                allow="payment"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
              />
              <p>
                Having trouble signing in or paying?{" "}
                <a
                  href={venue.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open the full booking page <ExternalLink size={12} />
                </a>
              </p>
            </div>
          ) : (
            <div className="provider-handoff">
              <BookOpen size={35} />
              <h3>
                {venue.kind === "study"
                  ? "Make room for a focused session."
                  : "Get your next game in the calendar."}
              </h3>
              <p>{venue.description}</p>
              <Button asChild variant="secondary">
                <a
                  href={venue.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {venue.provider === "Library"
                    ? "View library room arrangements"
                    : "Continue to venue"}
                  <ExternalLink size={16} />
                </a>
              </Button>
            </div>
          )}
          <p className="booking-return-note">
            After booking, add the court or room and confirmed time to your
            Spark so your group knows where to meet.
          </p>
        </>
      )}
    </Modal>
  );
}

function PlaceSearch({
  kind,
  onSelect,
  initialCity = "all",
  limit = 12,
  filters,
  onFilterChange,
  onBook,
  selectedId,
}: {
  kind: PlaceKind;
  onSelect: (v: Venue) => void;
  initialCity?: string;
  limit?: number;
  filters?: { query: string; city: string };
  onFilterChange?: (filters: { query: string; city: string }) => void;
  onBook?: (venue: Venue) => void;
  selectedId?: string;
}) {
  const [localQuery, setLocalQuery] = useState("");
  const [localCity, setLocalCity] = useState(initialCity);
  const query = filters?.query ?? localQuery;
  const city = filters?.city ?? localCity;
  const [shown, setShown] = useState(limit);
  function change(patch: Partial<{ query: string; city: string }>) {
    const next = { query, city, ...patch };
    setShown(limit);
    if (filters && onFilterChange) onFilterChange(next);
    else {
      setLocalQuery(next.query);
      setLocalCity(next.city);
    }
  }
  const matches = venues.filter(
    (v) =>
      v.kind === kind &&
      (city === "all" || v.city === city) &&
      `${v.name} ${v.city} ${v.area} ${v.address}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const locations = [
    ...new Set(venues.filter((v) => v.kind === kind).map((v) => v.city)),
  ].sort();
  return (
    <>
      <div
        className="place-search-controls"
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target instanceof HTMLInputElement)
            e.preventDefault();
        }}
      >
        <div className="place-search-input">
          <Search size={18} />
          <input
            aria-label={
              kind === "badminton"
                ? "Search badminton centres"
                : "Search study spaces"
            }
            placeholder={
              kind === "badminton"
                ? "Centre name, neighbourhood or city…"
                : "Library, study room or neighbourhood…"
            }
            value={query}
            onChange={(e) => {
              change({ query: e.target.value.slice(0, 120) });
            }}
          />
          {query && (
            <button
              type="button"
              className="place-clear-search"
              aria-label="Clear place search"
              onClick={() => change({ query: "" })}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <select
          aria-label="Filter centres by city"
          value={city}
          onChange={(e) => {
            change({ city: e.target.value });
          }}
        >
          <option value="all">All areas</option>
          {locations.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {(query || city !== "all") && (
          <button
            type="button"
            className="place-reset-filters"
            onClick={() => change({ query: "", city: "all" })}
          >
            Reset filters
          </button>
        )}
      </div>
      <p className="place-result-count" role="status">
        {matches.length}{" "}
        {kind === "badminton"
          ? matches.length === 1
            ? "badminton centre"
            : "badminton centres"
          : matches.length === 1
            ? "study space"
            : "study spaces"}
        <span> · Provider listings reviewed 22 Oct 2026</span>
      </p>
      <div className="places-grid">
        {matches.slice(0, shown).map((v) => (
          <article key={v.id} className={`place-card place-${kind}`}>
            <div className="place-card-top">
              <span className="place-symbol">
                {kind === "study" ? (
                  <BookOpen size={25} />
                ) : (
                  <span aria-hidden="true">🏸</span>
                )}
              </span>
              <span
                className={`place-provider ${v.provider === "AFA" ? "provider-online" : ""}`}
              >
                {v.provider === "AFA"
                  ? "Online court booking"
                  : v.provider === "Library"
                    ? "Library & study rooms"
                    : "Venue booking"}
              </span>
            </div>
            <h3>{v.name}</h3>
            <p className="place-address">
              <MapPin size={14} />
              {v.address || venueLocality(v)}
            </p>
            <p>{v.description}</p>
            <div className="place-card-links">
              <a
                href={venueDirections(v)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Directions <ExternalLink size={12} />
              </a>
              <a href={v.source} target="_blank" rel="noopener noreferrer">
                Venue details <ExternalLink size={12} />
              </a>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onSelect(v)}
              aria-pressed={selectedId ? selectedId === v.id : undefined}
            >
              {kind === "badminton"
                ? "Choose this centre"
                : "Choose this space"}
              <ArrowRight size={15} />
            </Button>
            {onBook && (
              <button
                type="button"
                className="place-quick-book"
                onClick={() => onBook(v)}
              >
                View booking options <ExternalLink size={13} />
              </button>
            )}
          </article>
        ))}
      </div>
      {!matches.length && (
        <div className="plans-empty">
          <h3>
            No {kind === "badminton" ? "centres" : "study spaces"} match those
            filters.
          </h3>
          <p>Try another area or search a shorter name.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              change({ city: "all", query: "" });
            }}
          >
            Show all areas
          </Button>
        </div>
      )}
      {matches.length > shown && (
        <Button
          type="button"
          variant="outline"
          className="places-load-more"
          onClick={() => setShown((n) => n + limit)}
        >
          Show more {kind === "badminton" ? "centres" : "spaces"}{" "}
          <ArrowRight size={15} />
        </Button>
      )}
    </>
  );
}

export function VenuePicker({
  kind,
  city,
  value,
  onChange,
}: {
  kind: PlaceKind;
  city: string;
  value: string;
  onChange: (v: Venue | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [booking, setBooking] = useState<Venue | null>(null);
  const venue = venueById(value);
  return (
    <div className="venue-picker">
      <div className="venue-picker-label">
        <b>{kind === "badminton" ? "Find your court" : "Find a study space"}</b>
        <span>
          {venues.filter((v) => v.kind === kind).length} places to choose from
        </span>
      </div>
      {venue ? (
        <div className="selected-place">
          <span className="selected-place-symbol">
            {kind === "badminton" ? "🏸" : <BookOpen size={24} />}
          </span>
          <div>
            <b>{venue.name}</b>
            <p>{venue.address || venueLocality(venue)}</p>
            <div className="selected-place-actions">
              <button type="button" onClick={() => setBooking(venue)}>
                {kind === "badminton"
                  ? "Check courts & booking"
                  : "Check rooms & booking"}{" "}
                <ExternalLink size={13} />
              </button>
              <button type="button" onClick={() => setOpen(true)}>
                Change
              </button>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Remove selected place"
            onClick={() => onChange(null)}
          >
            <X size={17} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="venue-picker-trigger"
          onClick={() => setOpen(true)}
        >
          <Search size={20} />
          <span>
            <b>
              {kind === "badminton"
                ? "Search badminton centres"
                : "Search libraries & study rooms"}
            </b>
            <small>
              {kind === "badminton"
                ? "KL, PJ, Subang, Shah Alam and more"
                : "Quiet corners and group study spaces"}
            </small>
          </span>
          <ArrowRight size={18} />
        </button>
      )}
      {!venue && (
        <small className="place-optional-note">
          Optional — you can arrange a place with your group later.
        </small>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          kind === "badminton"
            ? "Find a badminton centre"
            : "Find a study space"
        }
        className="place-picker-modal"
      >
        {open && (
          <PlaceSearch
            kind={kind}
            initialCity={
              venues.some((v) => v.kind === kind && v.city === city)
                ? city
                : "all"
            }
            limit={6}
            onSelect={(v) => {
              onChange(v);
              setOpen(false);
            }}
          />
        )}
      </Modal>
      <VenueBooking
        key={booking?.id ?? "none"}
        venue={booking}
        onClose={() => setBooking(null)}
      />
    </div>
  );
}

export function PlacesPage() {
  const { state } = useApp();
  const { params, update } = useUrlState();
  const kind: PlaceKind =
    params.get("kind") === "study" ? "study" : "badminton";
  const query = (params.get("q") ?? "").slice(0, 120);
  const city = venues.some(
    (v) => v.kind === kind && v.city === params.get("city"),
  )
    ? params.get("city")!
    : "all";
  const selected = venueById(params.get("place"));
  const [booking, setBooking] = useState<Venue | null>(null);
  const detailsRef = useRef<HTMLElement>(null);
  return (
    <>
      <PageHeading
        eyebrow="Courts, study spaces & somewhere to meet"
        title="Find a place for your plan."
        description="Explore badminton centres and study spaces around KL and Selangor. Check booking options, then make a plan around the place."
      >
        <span className="places-total">
          {venues.length} places in KL & Selangor
        </span>
      </PageHeading>
      <nav className="places-kind-tabs" aria-label="Types of places">
        <Link
          href="/places"
          aria-current={kind === "badminton" ? "page" : undefined}
        >
          🏸 Badminton centres{" "}
          <span>{venues.filter((v) => v.kind === "badminton").length}</span>
        </Link>
        <Link
          href="/places?kind=study"
          aria-current={kind === "study" ? "page" : undefined}
        >
          <BookOpen size={17} />
          Study spaces{" "}
          <span>{venues.filter((v) => v.kind === "study").length}</span>
        </Link>
      </nav>
      <PlaceSearch
        key={kind}
        kind={kind}
        initialCity="all"
        filters={{ query, city }}
        onFilterChange={(f) =>
          update({
            q: f.query,
            city: f.city === "all" ? null : f.city,
            place: null,
          })
        }
        selectedId={selected?.id}
        onBook={(v) => setBooking(v)}
        onSelect={(v) => {
          update({ place: v.id }, "push");
          requestAnimationFrame(() =>
            detailsRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            }),
          );
        }}
      />
      {selected && selected.kind === kind && (
        <section
          className="place-selection-panel"
          ref={detailsRef}
          aria-label="Your selected place"
        >
          <span className="selection-check">
            <Check size={22} />
          </span>
          <div>
            <span className="eyebrow">Your next place to meet</span>
            <h2>{selected.name}</h2>
            <p>{selected.address || venueLocality(selected)}</p>
          </div>
          <div className="place-selection-actions">
            <Button variant="secondary" onClick={() => setBooking(selected)}>
              Check booking <ExternalLink size={16} />
            </Button>
            <Button asChild variant="outline">
              <Link
                href={`/sparks/create?venue=${selected.id}&category=${kind}`}
              >
                Make a plan here <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </section>
      )}
      <p className="places-footnote">
        {state.profile.age === "youth"
          ? "Create group plans in your approved school community. "
          : ""}
        The venue controls prices, availability and booking terms. Check the
        provider’s confirmation before recording a space as booked.
      </p>
      <VenueBooking
        key={booking?.id ?? "none"}
        venue={booking}
        onClose={() => setBooking(null)}
      />
    </>
  );
}

export function SparkPlace({ spark }: { spark: Spark }) {
  const { state } = useApp();
  const [booking, setBooking] = useState(false);
  const venue = venueById(spark.venueId);
  if (!venue) return null;
  return (
    <section className="spark-place-card">
      <span className="place-symbol">
        {venue.kind === "study" ? <BookOpen size={24} /> : "🏸"}
      </span>
      <div>
        <span className="eyebrow">
          {venue.kind === "study"
            ? "Your study space"
            : "Your badminton centre"}
        </span>
        <h3>{venue.name}</h3>
        <p>
          {spark.spaceLabel
            ? `${venue.kind === "badminton" ? "Court" : "Space"}: ${spark.spaceLabel} · `
            : ""}
          {venueLocality(venue)}
        </p>
        <span
          className={`place-booking-state ${spark.bookingStatus === "booked" ? "is-booked" : ""}`}
        >
          {spark.bookingStatus === "booked"
            ? "Booking recorded by organizer"
            : "Booking still to arrange"}
        </span>
        {spark.ownerId === state.profile.id && spark.bookingReference && (
          <small>
            Your booking reference: <b>{spark.bookingReference}</b> · visible
            only to you
          </small>
        )}
        <div className="selected-place-actions">
          <a
            href={venueDirections(venue)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Directions <ExternalLink size={13} />
          </a>
          <button type="button" onClick={() => setBooking(true)}>
            Open booking page <ExternalLink size={13} />
          </button>
        </div>
      </div>
      <VenueBooking
        venue={booking ? venue : null}
        onClose={() => setBooking(false)}
      />
    </section>
  );
}
