export interface MarketPriceSource {
  source: string;
  url: string;
  accessedAt: string;
  anchorLabel: string;
  marketAnchor: number;
  offerPrice: number;
}

/**
 * Real German web-design market pricing for a one-page local-business
 * site (the closest comparable to what this project's demos are),
 * researched via live web search on the date below from three
 * independent agency/industry-overview sources — never invented. Each
 * row's `offerPrice` is exactly `marketAnchor - 100`, per the pricing
 * rule: document the anchor, then undercut it by precisely €100.
 *
 * This is a point-in-time snapshot (web prices drift) — re-run the
 * research periodically and update this file rather than computing a
 * "live" price at request time, so every quote traces back to a
 * specific, checkable source and date instead of a silent re-fetch.
 */
export const MARKET_PRICE_SOURCES: MarketPriceSource[] = [
  {
    source: "dailyseven.de – Webdesign Preise Berlin",
    url: "https://www.dailyseven.de/webdesign-preise-berlin/",
    accessedAt: "2026-09-08",
    anchorLabel: "Onepager, Startpreis (zzgl. MwSt.)",
    marketAnchor: 999,
    offerPrice: 899,
  },
  {
    source: "seiten-werk.com – Webdesign Preise Übersicht 2026",
    url: "https://seiten-werk.com/webdesign-preise/",
    accessedAt: "2026-09-08",
    anchorLabel: "Onepager, Festpreis-Einstieg",
    marketAnchor: 1500,
    offerPrice: 1400,
  },
  {
    source: "kopfundstift.de – Webdesign Kosten & Preise 2026",
    url: "https://kopfundstift.de/webdesign-kosten/",
    accessedAt: "2026-09-08",
    anchorLabel: "One-Pager/Landingpage, Einstieg",
    marketAnchor: 1000,
    offerPrice: 900,
  },
];

export function averageOfferPrice(): number {
  const sum = MARKET_PRICE_SOURCES.reduce((s, x) => s + x.offerPrice, 0);
  return Math.round(sum / MARKET_PRICE_SOURCES.length);
}

export function averageMarketAnchor(): number {
  const sum = MARKET_PRICE_SOURCES.reduce((s, x) => s + x.marketAnchor, 0);
  return Math.round(sum / MARKET_PRICE_SOURCES.length);
}
