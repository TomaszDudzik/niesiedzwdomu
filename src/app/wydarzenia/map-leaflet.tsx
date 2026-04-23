"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
/* Fix default marker icons (Leaflet + webpack issue) */
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

export interface MarkerGroup {
  coords: [number, number];
  events: { id: string; title: string; slug: string; street: string; city: string; image_url?: string | null }[];
  label: string;
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
        <Marker key={`${group.coords[0]}-${group.coords[1]}`} position={group.coords}>
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
