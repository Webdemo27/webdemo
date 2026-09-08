import type { ImageRole } from "../visual-director/types";

export interface DemoAssetView {
  role: ImageRole;
  altText: string;
  aspectRatio: string;
  width: number;
  height: number;
  src: string;
  srcsetWebp?: string;
  srcsetAvif?: string;
  isVector: boolean;
}

interface RawAsset {
  role: string;
  altText: string;
  aspectRatio: string;
  width: number | null;
  height: number | null;
  localPath: string | null;
  formats: unknown;
}

function buildSrcset(formats: Record<string, string> | undefined): string | undefined {
  if (!formats) return undefined;
  const entries = Object.entries(formats);
  if (entries.length === 0) return undefined;
  return entries.map(([width, file]) => `assets/${file} ${width}w`).join(", ");
}

function largest(formats: Record<string, string> | undefined): string | undefined {
  if (!formats) return undefined;
  const widths = Object.keys(formats).map(Number);
  if (widths.length === 0) return undefined;
  return formats[String(Math.max(...widths))];
}

export function toAssetView(raw: RawAsset): DemoAssetView {
  if (raw.localPath) {
    return {
      role: raw.role as ImageRole,
      altText: raw.altText,
      aspectRatio: raw.aspectRatio,
      width: raw.width ?? 0,
      height: raw.height ?? 0,
      src: raw.localPath,
      isVector: raw.localPath.endsWith(".svg"),
    };
  }

  const formats = (raw.formats ?? {}) as { webp?: Record<string, string>; avif?: Record<string, string> };
  const webpFile = largest(formats.webp);

  return {
    role: raw.role as ImageRole,
    altText: raw.altText,
    aspectRatio: raw.aspectRatio,
    width: raw.width ?? 0,
    height: raw.height ?? 0,
    src: webpFile ? `assets/${webpFile}` : "",
    srcsetWebp: buildSrcset(formats.webp),
    srcsetAvif: buildSrcset(formats.avif),
    isVector: false,
  };
}

export function groupByRole(assets: DemoAssetView[]): Record<string, DemoAssetView[]> {
  const grouped: Record<string, DemoAssetView[]> = {};
  for (const asset of assets) {
    (grouped[asset.role] ??= []).push(asset);
  }
  return grouped;
}
