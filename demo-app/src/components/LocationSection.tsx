import { useEffect, useState } from "react";

const WEATHER_ICONS: Record<string, string> = {
  sun: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a5 5 0 1 1 1.3-9.8A6 6 0 0 1 22 12.5 4.5 4.5 0 0 1 17.5 19Z"/></svg>',
  rain: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 13v6M8 13v6M12 15v6"/><path d="M17.5 15H9a5 5 0 1 1 1.3-9.8A6 6 0 0 1 22 8.5 4.5 4.5 0 0 1 17.5 15Z"/></svg>',
  snow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01"/><path d="M17.5 13H9a5 5 0 1 1 1.3-9.8A6 6 0 0 1 22 6.5 4.5 4.5 0 0 1 17.5 13Z"/></svg>',
  storm:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 13H9a5 5 0 1 1 1.3-9.8A6 6 0 0 1 22 6.5 4.5 4.5 0 0 1 17.5 13Z"/><path d="m13 13-3 5h4l-3 5"/></svg>',
};

const WMO_CODES: Record<number, [string, string]> = {
  0: ["Klar", "sun"],
  1: ["Meist klar", "sun"],
  2: ["Bewölkt", "cloud"],
  3: ["Bedeckt", "cloud"],
  45: ["Nebel", "cloud"],
  48: ["Nebel", "cloud"],
  51: ["Nieselregen", "rain"],
  53: ["Nieselregen", "rain"],
  55: ["Nieselregen", "rain"],
  56: ["Nieselregen", "rain"],
  57: ["Nieselregen", "rain"],
  61: ["Regen", "rain"],
  63: ["Regen", "rain"],
  65: ["Regen", "rain"],
  66: ["Regen", "rain"],
  67: ["Regen", "rain"],
  71: ["Schnee", "snow"],
  73: ["Schnee", "snow"],
  75: ["Schnee", "snow"],
  77: ["Schnee", "snow"],
  80: ["Schauer", "rain"],
  81: ["Schauer", "rain"],
  82: ["Schauer", "rain"],
  85: ["Schneeschauer", "snow"],
  86: ["Schneeschauer", "snow"],
  95: ["Gewitter", "storm"],
  96: ["Gewitter", "storm"],
  99: ["Gewitter", "storm"],
};

/** Same real-data source as the static engine's weatherBadge (see
 * .ai/design-inspiration-playbook.md, Autowerkstatt section) — a live
 * current-weather reading for the lead's real coordinates via
 * Open-Meteo (free, keyless, CORS-open). Never shows a broken/
 * placeholder state: stays null (renders nothing) until real data
 * loads, silently, if the fetch ever fails. */
function WeatherBadge({ lat, lon }: { lat: number; lon: number }) {
  const [reading, setReading] = useState<{ temp: number; icon: string; label: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled || !data?.current) return;
        const [label, icon] = WMO_CODES[data.current.weather_code] ?? ["", "cloud"];
        setReading({ temp: Math.round(data.current.temperature_2m), icon, label });
      })
      .catch(() => {
        // Offline preview, API unreachable — badge just never appears.
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  if (!reading) return null;

  return (
    <span className="weather-badge">
      <span className="weather-icon" dangerouslySetInnerHTML={{ __html: WEATHER_ICONS[reading.icon] }} />
      <span>
        {reading.temp}°C{reading.label ? ` · ${reading.label}` : ""}
      </span>
    </span>
  );
}

/** Real embedded OpenStreetMap, centered on this exact business's real
 * coordinates — same bbox/marker math as the static engine's
 * locationMapEmbed, ported for consistency between the two engines. */
export function LocationSection({ location, latitude, longitude }: { location: string; latitude: number | null; longitude: number | null }) {
  if (latitude == null || longitude == null) return null;

  const dLat = 0.004;
  const dLon = 0.007;
  const bbox = [longitude - dLon, latitude - dLat, longitude + dLon, latitude + dLat].map((n) => n.toFixed(5)).join("%2C");
  const marker = `${latitude.toFixed(5)}%2C${longitude.toFixed(5)}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;

  return (
    <section className="location-banner">
      <span className="location-eyebrow">Vor Ort in</span>
      <span className="location-name">{location}</span>
      <WeatherBadge lat={latitude} lon={longitude} />
      <div className="location-map">
        <iframe src={src} loading="lazy" title="Standort auf der Karte" referrerPolicy="no-referrer-when-downgrade" />
      </div>
    </section>
  );
}
