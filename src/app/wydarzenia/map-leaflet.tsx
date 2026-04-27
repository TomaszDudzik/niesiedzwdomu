"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function createPlacePin(count: number, markerIcon: string) {
  const size = count > 1 ? 40 : 34;
  const emojiSize = count > 1 ? 26 : 22;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${emojiSize}px;line-height:1;position:relative;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.35));">${markerIcon}${count > 1 ? `<span style=\"position:absolute;right:-6px;top:-6px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#111;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.75);\">${count}</span>` : ""}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, Math.round(size * 0.82)],
    popupAnchor: [0, -Math.round(size * 0.6)],
  });
}

export interface MarkerGroup {
  coords: [number, number];
  events: { id: string; title: string; slug: string; street: string; city: string; image_url?: string | null }[];
  label: string;
  markerIcon?: string;
}

interface MapLeafletProps {
  groups: MarkerGroup[];
  basePath?: string;
}

export function MapLeaflet({ groups, basePath = "/wydarzenia" }: MapLeafletProps) {
  return (
    <MapContainer
      center={[50.0614, 19.9372]}
      zoom={12}
      className="w-full h-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {groups.map((group) => (
        <Marker
          key={`${group.coords[0]}-${group.coords[1]}`}
          position={group.coords}
          icon={createPlacePin(group.events.length, group.markerIcon || "📍")}
        >
          <Popup>
            <div className="min-w-[200px] max-w-[260px]">
              {/* Show image for the first item if available */}
              {group.events[0]?.image_url && (
                <a href={`${basePath}/${group.events[0].slug}`}>
                  <img
                    src={group.events[0].image_url}
                    alt={group.label}
                    className="w-full h-[100px] object-cover rounded-md mb-2"
                  />
                </a>
              )}
              <a
                href={`${basePath}/${group.events[0]?.slug}`}
                className="font-semibold text-[13px] text-gray-900 hover:text-blue-600 transition-colors block mb-1 leading-snug"
              >
                {group.label}
              </a>
              {(group.events[0]?.street || group.events[0]?.city) && (
                <p className="text-[11px] text-gray-500 mb-2">{[group.events[0].street, group.events[0].city].filter(Boolean).join(", ")}</p>
              )}
              {group.events.length > 1 && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  <p className="text-[11px] text-gray-400 mb-1.5">
                    +{group.events.length - 1} więcej w tej lokalizacji
                  </p>
                  <ul className="space-y-1">
                    {group.events.slice(1, 4).map((event) => (
                      <li key={event.id}>
                        <a
                          href={`${basePath}/${event.slug}`}
                          className="text-[12px] text-blue-600 hover:underline line-clamp-1"
                        >
                          {event.title}
                        </a>
                      </li>
                    ))}
                    {group.events.length > 4 && (
                      <li className="text-[11px] text-gray-400">
                        + {group.events.length - 4} więcej
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
