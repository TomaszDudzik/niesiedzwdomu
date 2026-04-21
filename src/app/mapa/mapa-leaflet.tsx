"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

export interface MapaMarker {
  id: string;
  coords: [number, number];
  title: string;
  href: string;
  emoji: string;
  color: string;
  street?: string | null;
  city?: string | null;
}

function createDotIcon(emoji: string, color: string, active: boolean) {
  const size = active ? 40 : 34;
  const border = active ? "4px" : "3px";
  const shadow = active
    ? "0 3px 12px rgba(0,0,0,0.35)"
    : "0 2px 6px rgba(0,0,0,0.22)";
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:${active ? 17 : 14}px;border:${border} solid #fff;box-shadow:${shadow};cursor:pointer;transition:all 0.15s;">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

function FlyTo({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [coords, map]);
  return null;
}

interface MapaLeafletProps {
  markers: MapaMarker[];
  selectedId: string | null;
  onMarkerClick: (id: string) => void;
}

export function MapaLeaflet({ markers, selectedId, onMarkerClick }: MapaLeafletProps) {
  const selectedMarker = markers.find((m) => m.id === selectedId) ?? null;

  return (
    <MapContainer
      center={[50.0614, 19.9372]}
      zoom={12}
      className="w-full h-full"
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo coords={selectedMarker?.coords ?? null} />
      {markers.map((marker) => {
        const active = marker.id === selectedId;
        return (
          <Marker
            key={marker.id}
            position={marker.coords}
            icon={createDotIcon(marker.emoji, active ? "#2D2926" : marker.color, active)}
            zIndexOffset={active ? 1000 : 0}
            eventHandlers={{ click: () => onMarkerClick(marker.id) }}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <a
                  href={marker.href}
                  style={{ fontWeight: 600, fontSize: 13, color: "#2D2926", display: "block", marginBottom: 4 }}
                >
                  {marker.title}
                </a>
                {(marker.street || marker.city) && (
                  <p style={{ fontSize: 11, color: "#7A7572", margin: 0 }}>
                    {[marker.street, marker.city].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
