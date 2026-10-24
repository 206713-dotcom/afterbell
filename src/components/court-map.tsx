"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { areas } from "@/lib/locations";
import { Button } from "./ui/button";
import "leaflet/dist/leaflet.css";

export default function CourtMap({ city }: { city: string }) {
  const [open, setOpen] = useState(false),
    [failed, setFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const point =
    areas.find((a) => a.city === city) ??
    areas.find((a) => a.city === "Kuala Lumpur")!;
  useEffect(() => {
    if (!open || !container.current) return;
    let active = true,
      map: import("leaflet").Map | undefined;
    import("leaflet")
      .then((L) => {
        if (!active || !container.current) return;
        map = L.map(container.current, { scrollWheelZoom: false }).setView(
          [point.lat, point.lng],
          12,
        );
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        })
          .on("tileerror", () => setFailed(true))
          .addTo(map);
        L.control.scale({ imperial: false }).addTo(map);
      })
      .catch(() => setFailed(true));
    return () => {
      active = false;
      map?.remove();
    };
  }, [open, point.lat, point.lng]);
  return (
    <div className="court-map-wrap">
      <p className="subtle">
        Explore {point.city}. The map uses a broad city centre; court addresses
        are listed above. Individual locations and unverified venue pins are not
        displayed.
      </p>
      {open ? (
        <>
          <div
            ref={container}
            className="court-leaflet"
            role="region"
            aria-label={`Interactive OpenStreetMap around ${point.city}`}
          />
          {failed && (
            <p role="status">
              Some map tiles could not load. Use the venue addresses or
              OpenStreetMap search link.
            </p>
          )}
        </>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <MapPin size={15} />
          Load interactive court map
        </Button>
      )}
      <p className="subtle">
        Loading the map connects to OpenStreetMap for map tiles.
      </p>
    </div>
  );
}
