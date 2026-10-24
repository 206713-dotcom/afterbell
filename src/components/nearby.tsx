"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  Compass,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useApp } from "./store";
import {
  ActivityCard,
  Badge,
  Empty,
  ErrorMessage,
  Loading,
  Modal,
  PageHeading,
} from "./shared";
import { Button } from "./ui/button";
import {
  areas,
  areaById,
  areaLabel,
  cityArea,
  distanceKm,
  distanceLabel,
  nearestArea,
  type Coordinates,
} from "@/lib/locations";
import { findNearbyPeople, nearbyInterests } from "@/lib/nearby";
import { nearbyPeople as demoPeople } from "@/lib/nearby-fixtures";
import { accessibleSparks } from "@/lib/discovery";
import type { NearbyPerson, NearbySettings } from "@/lib/types";

function AreaOptions() {
  return (
    <>
      {[...new Set(areas.map((area) => area.city))].map((city) => (
        <optgroup label={city} key={city}>
          {areas
            .filter((area) => area.city === city)
            .map((area) => (
              <option value={area.id} key={area.id}>
                {area.name === city ? `${city} · city area` : area.name}
              </option>
            ))}
        </optgroup>
      ))}
    </>
  );
}

export function Nearby() {
  const { state, loading } = useApp();
  if (loading) return <Loading />;
  if (state.profile.age !== "adult")
    return (
      <>
        <PageHeading
          eyebrow="Your community"
          title="Your people, in your school spaces."
          description="Nearby people discovery is for adult accounts. Connect through your approved school hubs instead."
        />
        <div className="nearby-youth">
          <ShieldCheck size={34} />
          <h2>A familiar space to get together.</h2>
          <p>
            Find study circles and shared interests inside your approved,
            private communities. Your location is never listed in the public
            people directory.
          </p>
          <Button asChild variant="secondary">
            <Link href="/hubs">
              Open your communities <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </>
    );
  return <NearbyDiscovery key={`${state.profile.id}-${state.profile.city}`} />;
}

function NearbyDiscovery() {
  const { state, demo } = useApp();
  const [areaId, setAreaId] = useState(
    state.nearbySettings?.areaId ?? cityArea(state.profile.city).id,
  );
  const [device, setDevice] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [radius, setRadius] = useState(25);
  const [interest, setInterest] = useState("all");
  const [similar, setSimilar] = useState(false);
  const [sort, setSort] = useState("distance");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"people" | "sparks">("people");
  const [selected, setSelected] = useState<NearbyPerson | null>(null);
  const [settings, setSettings] = useState(false);
  const [map, setMap] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [remote, setRemote] = useState<{
    key: string;
    people: NearbyPerson[];
    error: string;
  }>({ key: "", people: [], error: "" });
  const locationRequest = useRef(0);
  useEffect(
    () => () => {
      locationRequest.current += 1;
    },
    [],
  );
  const area = areaById(areaId) ?? cityArea(state.profile.city);
  const origin = device ?? area;
  const queryRadius = Math.min(
    3000,
    Math.ceil(radius + (device ? distanceKm(device, area) : 0)),
  );
  const url = `/api/nearby?${new URLSearchParams({ area: area.id, radius: String(queryRadius), ...(interest !== "all" ? { interest } : {}) })}`;
  const requestKey = `${url}|${refresh}|${state.profile.id}|${state.blocked.join(",")}`;
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Nearby people could not load.");
        if (!controller.signal.aborted)
          setRemote({ key: requestKey, people: data.people, error: "" });
      } catch (error) {
        if (!controller.signal.aborted)
          setRemote({
            key: requestKey,
            people: [],
            error: error instanceof Error ? error.message : "Please try again.",
          });
      }
    }
    void load();
    return () => controller.abort();
  }, [demo, url, requestKey]);
  const pending = !demo && remote.key !== requestKey;
  const directory = demo
    ? (state.nearbyPeople ?? demoPeople)
    : remote.key === requestKey
      ? remote.people
      : [];
  const people = findNearbyPeople(
    directory,
    state.profile,
    state.blocked,
    origin,
    radius,
    interest,
    similar,
    query,
    sort,
  );
  const sparks = accessibleSparks(state)
    .filter((spark) =>
      areas.some(
        (area) => area.city === spark.city && area.name === spark.city,
      ),
    )
    .map((spark) => ({
      spark,
      distance: distanceKm(origin, cityArea(spark.city)),
    }))
    .filter(({ spark, distance }) => {
      const text =
        `${spark.title} ${spark.description} ${spark.category} ${spark.skill}`.toLowerCase();
      return (
        distance <= radius &&
        (interest === "all" || text.includes(interest.toLowerCase())) &&
        (!similar ||
          state.profile.interests.some((mine) =>
            text.includes(mine.toLowerCase()),
          )) &&
        text.includes(query.trim().toLowerCase())
      );
    })
    .sort(
      (a, b) => a.distance - b.distance || a.spark.id.localeCompare(b.spark.id),
    );
  function chooseArea(value: string) {
    locationRequest.current += 1;
    setLocating(false);
    setDevice(null);
    setLocationError("");
    setAreaId(value);
  }
  function locate() {
    if (!navigator.geolocation || !window.isSecureContext) {
      setLocationError(
        "Device location isn’t available here. Choose an area to keep exploring.",
      );
      return;
    }
    const request = ++locationRequest.current;
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (request !== locationRequest.current) return;
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const closest = nearestArea(point);
        setLocating(false);
        if (
          !Number.isFinite(point.lat) ||
          !Number.isFinite(point.lng) ||
          distanceKm(point, closest) > 100 ||
          position.coords.accuracy > 25000
        ) {
          setLocationError(
            "Your device couldn’t provide a useful location for our supported areas. Choose an area below instead.",
          );
          return;
        }
        setAreaId(closest.id);
        setDevice(point);
      },
      (error) => {
        if (request !== locationRequest.current) return;
        setLocating(false);
        setLocationError(
          error.code === 1
            ? "Location access was denied. You can still choose an area below."
            : error.code === 3
              ? "Location took too long. Try again or choose an area below."
              : "Your location couldn’t be found. Choose an area below to keep exploring.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 },
    );
  }
  function clearFilters() {
    setInterest("all");
    setSimilar(false);
    setQuery("");
    setRadius(25);
  }
  return (
    <>
      <PageHeading
        eyebrow="Near you"
        title="Find your people, nearby."
        description="Shared interests. Familiar places. A few new faces to make plans with."
      >
        <Button variant="outline" onClick={() => setSettings(true)}>
          <Settings2 size={16} /> My nearby profile
        </Button>
      </PageHeading>
      <section
        className="nearby-location"
        aria-label="Your nearby search location"
      >
        <div className="nearby-location-heading">
          <span className="nearby-location-icon">
            <MapPin size={25} />
          </span>
          <div>
            <span className="eyebrow">Your starting point</span>
            <h2>
              {device
                ? "Looking around your current location"
                : areaLabel(area)}
            </h2>
            <p>
              {device
                ? "Used for this search only. Your device position stays in this page and disappears when you leave."
                : "Explore from a broad area. No device location needed."}
            </p>
          </div>
          <Button variant="secondary" disabled={locating} onClick={locate}>
            <LocateFixed size={16} />
            {locating ? "Finding your location…" : "Use my location"}
          </Button>
        </div>
        {locationError && (
          <p className="location-message" role="status">
            {locationError}
          </p>
        )}
        {device && (
          <button
            className="location-clear"
            onClick={() => chooseArea(area.id)}
          >
            <X size={13} /> Forget device location and use {area.name}
          </button>
        )}
        <div className="nearby-location-fields">
          <label>
            Explore around
            <select
              className="input"
              aria-label="Explore around"
              value={area.id}
              onChange={(e) => chooseArea(e.target.value)}
            >
              <AreaOptions />
            </select>
          </label>
          <label>
            Search distance
            <select
              className="input"
              aria-label="Search distance"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            >
              {[5, 10, 25, 50, 100].map((value) => (
                <option value={value} key={value}>
                  Within about {value} km
                </option>
              ))}
              <option value="3000">Across Malaysia</option>
            </select>
          </label>
          <button
            className="area-map-button"
            onClick={() => setMap(!map)}
            aria-expanded={map}
          >
            <Navigation size={15} />
            {map ? "Hide area map" : "See area map"}
          </button>
        </div>
        <div className="nearby-location-footnote">
          <ShieldCheck size={14} />
          <span>
            Distances are estimates to shared area centres, never people’s exact
            positions.
          </span>
        </div>
        {map && (
          <div className="nearby-area-map">
            <iframe
              title={`Area map around ${areaLabel(area)}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${area.lng - 0.05}%2C${area.lat - 0.035}%2C${area.lng + 0.05}%2C${area.lat + 0.035}&layer=mapnik`}
            />
            <p>
              Map of {areaLabel(area)}. No individual people or device positions
              are shown.
            </p>
            <a
              className="text-link"
              target="_blank"
              rel="noreferrer"
              href={`https://www.openstreetmap.org/#map=13/${area.lat}/${area.lng}`}
            >
              Open area map <ArrowRight size={13} />
            </a>
          </div>
        )}
      </section>
      <div className="nearby-browse-header">
        <div className="nearby-tabs" role="group" aria-label="Nearby results">
          <button
            aria-pressed={tab === "people"}
            onClick={() => {
              setTab("people");
              setQuery("");
            }}
          >
            <Users size={16} />
            People nearby
          </button>
          <button
            aria-pressed={tab === "sparks"}
            onClick={() => {
              setTab("sparks");
              setQuery("");
            }}
          >
            <Compass size={16} />
            Nearby Sparks
          </button>
        </div>
        <span className="nearby-listing-note">
          Opted-in adult profiles ·{" "}
          {demo ? "Fictional demo people" : "Community members"}
        </span>
      </div>
      <div className="nearby-filters">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search nearby people or Sparks"
            placeholder={
              tab === "people"
                ? "A name, a subject, a shared interest…"
                : "Search nearby Sparks…"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          className="input"
          aria-label="Filter nearby interests"
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
        >
          <option value="all">All interests</option>
          {nearbyInterests.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="nearby-similar">
          <input
            type="checkbox"
            checked={similar}
            onChange={(e) => setSimilar(e.target.checked)}
          />{" "}
          Shared interests only
        </label>
      </div>
      <div className="nearby-results-heading">
        <p role="status">
          {pending && tab === "people"
            ? "Looking for nearby people…"
            : `${tab === "people" ? people.length : sparks.length} ${tab === "people" ? (people.length === 1 ? "person" : "people") : sparks.length === 1 ? "Spark" : "Sparks"} in this search`}
        </p>
        <div>
          {tab === "people" && (
            <>
              <select
                aria-label="Sort nearby people"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="distance">Closest area first</option>
                <option value="shared">Most shared interests</option>
              </select>
              <button
                className="icon-button"
                aria-label="Refresh nearby people"
                disabled={pending}
                onClick={() => setRefresh((value) => value + 1)}
              >
                <RefreshCw size={16} />
              </button>
            </>
          )}
        </div>
      </div>
      {!demo &&
      remote.key === requestKey &&
      remote.error &&
      tab === "people" ? (
        <div className="nearby-error">
          <ErrorMessage message={remote.error} />
          <Button
            variant="outline"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Try again
          </Button>
        </div>
      ) : tab === "people" ? (
        pending ? (
          <div
            className="nearby-people-grid"
            aria-label="Loading nearby people"
          >
            {[1, 2, 3].map((value) => (
              <div className="skeleton nearby-person-skeleton" key={value} />
            ))}
          </div>
        ) : people.length ? (
          <div className="nearby-people-grid">
            {people.map(({ person, area: personArea, distance, shared }) => (
              <article className="nearby-person-card" key={person.id}>
                <div className="nearby-person-top">
                  <span
                    className={`nearby-person-avatar avatar-tone-${person.name.charCodeAt(0) % 4}`}
                  >
                    {person.name[0]}
                  </span>
                  <Badge tone="neutral">
                    <MapPin size={11} />
                    {distanceLabel(distance)}
                  </Badge>
                </div>
                <h2>{person.name}</h2>
                <p className="nearby-person-area">{areaLabel(personArea)}</p>
                <p className="nearby-person-bio">
                  {person.bio ||
                    "Open to meeting people through a shared plan."}
                </p>
                <div className="nearby-interest-tags">
                  {person.interests.slice(0, 4).map((item) => (
                    <span
                      key={item}
                      className={shared.includes(item) ? "is-shared" : ""}
                    >
                      {shared.includes(item) && <Check size={11} />}
                      {item}
                    </span>
                  ))}
                </div>
                <div className="nearby-common">
                  <Users size={13} />
                  {shared.length
                    ? `${shared.length} shared ${shared.length === 1 ? "interest" : "interests"}`
                    : "A new interest to explore"}
                </div>
                <button
                  className="nearby-person-link"
                  onClick={() => setSelected(person)}
                >
                  Meet {person.name}
                  <ArrowRight size={17} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="nearby-empty">
            <Empty
              title="Your people might be a little further out."
              description="Try a wider distance or another area. Not everyone has chosen to make their profile visible."
              action={false}
            />
            <button className="text-link" onClick={clearFilters}>
              Reset search filters <ArrowRight size={14} />
            </button>
          </div>
        )
      ) : sparks.length ? (
        <>
          <p className="nearby-plans-note">
            Spark distances use city centres. Check the activity details before
            arranging a venue.
          </p>
          <div className="activity-grid">
            {sparks.map(({ spark, distance }) => (
              <div className="nearby-spark" key={spark.id}>
                <span className="nearby-spark-distance">
                  <MapPin size={12} />
                  {distanceLabel(distance)} · city estimate
                </span>
                <ActivityCard spark={spark} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <Empty
          title="Make the next plan near you."
          description="Try another interest or a wider area, or start a Spark for your community."
        />
      )}
      <section className="nearby-sharing-note">
        <ShieldCheck size={23} />
        <div>
          <h3>Your area. Your choice.</h3>
          <p>
            You can explore without appearing here. Sharing your nearby profile
            is a separate choice, and you can turn it off at any time.
          </p>
        </div>
        <Button variant="outline" onClick={() => setSettings(true)}>
          {state.nearbySettings?.visible
            ? "Manage my listing"
            : "Choose what to share"}
          <ArrowRight size={15} />
        </Button>
      </section>
      {selected && (
        <PersonDetails
          key={selected.id}
          person={selected}
          origin={origin}
          onClose={() => setSelected(null)}
          onFindPlans={() => {
            setSelected(null);
            setTab("sparks");
            setQuery("");
          }}
        />
      )}
      {settings && <NearbyPreferences onClose={() => setSettings(false)} />}
    </>
  );
}

function PersonDetails({
  person,
  origin,
  onClose,
  onFindPlans,
}: {
  person: NearbyPerson;
  origin: Coordinates;
  onClose: () => void;
  onFindPlans: () => void;
}) {
  const { mutate, notify } = useApp();
  const [busy, setBusy] = useState(false);
  const area = areaById(person.areaId)!;
  async function block() {
    setBusy(true);
    try {
      await mutate("block", { id: person.id });
      notify(`${person.name} is hidden from your discovery.`);
      onClose();
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open onClose={onClose} title={`Meet ${person.name}`}>
      <div className="nearby-profile-intro">
        <span
          className={`nearby-person-avatar avatar-tone-${person.name.charCodeAt(0) % 4}`}
        >
          {person.name[0]}
        </span>
        <div>
          <p>
            <MapPin size={14} />
            {areaLabel(area)}
          </p>
          <small>
            {distanceLabel(distanceKm(origin, area))} · shared area estimate
          </small>
        </div>
      </div>
      <p className="nearby-profile-bio">
        {person.bio || "Open to a good shared plan."}
      </p>
      <div className="nearby-profile-section">
        <h3>What {person.name} is into</h3>
        <div className="nearby-interest-tags">
          {person.interests.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        {person.interests.includes("Badminton") && (
          <p>On the court: {person.experience.toLowerCase()}</p>
        )}
        {person.subjects.length > 0 && (
          <p>Subjects: {person.subjects.join(", ")}</p>
        )}
      </div>
      <div className="nearby-profile-section">
        <h3>
          <Clock3 size={15} /> Usually free
        </h3>
        <p>
          {person.availability.join(" · ") || "Ask through a shared Spark."}
        </p>
        <small>
          General preferences. Every plan still needs an individual yes.
        </small>
      </div>
      <div className="nearby-profile-section">
        <h3>Start with something you both enjoy.</h3>
        <p>
          Meet through a community activity with a clear plan and individual
          approvals.
        </p>
        <Button variant="secondary" onClick={onFindPlans}>
          Explore nearby Sparks <ArrowRight size={15} />
        </Button>
      </div>
      <button
        className="text-link nearby-block"
        disabled={busy}
        onClick={() => void block()}
      >
        Hide and block {person.name}
      </button>
    </Modal>
  );
}

function NearbyPreferences({ onClose }: { onClose: () => void }) {
  const { state, mutate, notify } = useApp();
  const [data, setData] = useState<NearbySettings>(
    state.nearbySettings ?? {
      areaId: cityArea(state.profile.city).id,
      bio: "",
      visible: false,
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await mutate("nearby", data);
      notify(
        data.visible
          ? "Your nearby profile is visible to adult community members."
          : "Your nearby profile is hidden. You can still explore.",
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open onClose={onClose} title="Your nearby profile">
      <form onSubmit={save} className="nearby-preferences">
        <p>
          Choose a broad area and an intro. Using device location for a search
          never turns on profile sharing.
        </p>
        <ErrorMessage message={error} />
        <label className="field" htmlFor="nearby-public-area">
          Area I’m happy to share
          <select
            id="nearby-public-area"
            value={data.areaId ?? ""}
            onChange={(e) =>
              setData((value) => ({ ...value, areaId: e.target.value || null }))
            }
          >
            <option value="">Choose a broad area</option>
            <AreaOptions />
          </select>
        </label>
        <label className="field" htmlFor="nearby-public-bio">
          A little about me
          <textarea
            id="nearby-public-bio"
            value={data.bio}
            maxLength={180}
            rows={3}
            placeholder="What would you enjoy doing with people nearby?"
            onChange={(e) =>
              setData((value) => ({ ...value, bio: e.target.value }))
            }
          />
          <small>{data.bio.length}/180 characters</small>
        </label>
        <label className="nearby-visibility">
          <input
            type="checkbox"
            checked={data.visible}
            onChange={(e) =>
              setData((value) => ({ ...value, visible: e.target.checked }))
            }
          />
          <span>
            <b>Show my profile in nearby discovery</b>
            <small>
              Adult members can see my first name, chosen area, intro,
              interests, subjects, badminton level, and general availability. My
              exact position, age category, and school details stay private.
            </small>
          </span>
        </label>
        <p className="nearby-edit-interests">
          Interests and availability come from{" "}
          <Link href="/profile">
            your profile preferences <ArrowRight size={12} />
          </Link>
          .
        </p>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" disabled={busy}>
            {busy ? "Saving…" : "Save nearby profile"}
            <Check size={15} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
