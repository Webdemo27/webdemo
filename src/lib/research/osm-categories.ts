/** Curated local-business categories mapped to OpenStreetMap tags, plus a
 * German industry label for display. Extend this list to support more
 * categories — no code changes needed elsewhere. */
export interface OsmCategory {
  key: string;
  label: string;
  osmKey: string;
  osmValue: string;
}

export const OSM_CATEGORIES: OsmCategory[] = [
  { key: "bakery", label: "Bäckerei", osmKey: "shop", osmValue: "bakery" },
  { key: "restaurant", label: "Restaurant", osmKey: "amenity", osmValue: "restaurant" },
  { key: "cafe", label: "Café", osmKey: "amenity", osmValue: "cafe" },
  { key: "hairdresser", label: "Friseur", osmKey: "shop", osmValue: "hairdresser" },
  { key: "dentist", label: "Zahnarzt", osmKey: "amenity", osmValue: "dentist" },
  { key: "doctor", label: "Arztpraxis", osmKey: "amenity", osmValue: "doctors" },
  { key: "lawyer", label: "Rechtsanwalt", osmKey: "office", osmValue: "lawyer" },
  { key: "accountant", label: "Steuerberater", osmKey: "office", osmValue: "accountant" },
  { key: "physiotherapist", label: "Physiotherapie", osmKey: "amenity", osmValue: "physiotherapist" },
  { key: "florist", label: "Blumenladen", osmKey: "shop", osmValue: "florist" },
  { key: "bicycle", label: "Fahrradladen", osmKey: "shop", osmValue: "bicycle" },
  { key: "car_repair", label: "Autowerkstatt", osmKey: "shop", osmValue: "car_repair" },
  { key: "real_estate_agent", label: "Immobilienmakler", osmKey: "office", osmValue: "estate_agent" },
  { key: "hotel", label: "Hotel", osmKey: "tourism", osmValue: "hotel" },
  { key: "veterinary", label: "Tierarzt", osmKey: "amenity", osmValue: "veterinary" },
];

export function findCategory(key: string): OsmCategory | undefined {
  return OSM_CATEGORIES.find((c) => c.key === key);
}
