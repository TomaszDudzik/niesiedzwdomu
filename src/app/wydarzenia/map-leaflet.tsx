"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";

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

interface MarkerGroup {
  coords: [number, number];
  events: { id: string; title: string; slug: string; venue_name: string }[];
  label: string;
}

interface MapLeafletProps {
  groups: MarkerGroup[];
}

export function MapLeaflet({ groups }: MapLeafletProps) {
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
            <div className="min-w-[180px]">
              <p className="font-semibold text-[13px] mb-1">{group.label}</p>
              <p className="text-[11px] text-gray-500 mb-2">{group.events.length} wydarzeń</p>
              <ul className="space-y-1">
                {group.events.slice(0, 5).map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/wydarzenia/${event.slug}`}
                      className="text-[12px] text-blue-600 hover:underline line-clamp-1"
                    >
                      {event.title}
                    </Link>
                  </li>
                ))}
                {group.events.length > 5 && (
                  <li className="text-[11px] text-gray-400">
                    + {group.events.length - 5} więcej
                  </li>
                )}
              </ul>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
