import { ImageResponse } from "next/og"

import { AppIconMark } from "@/lib/app-icon"

export const dynamicParams = false

const VARIANTS: Record<string, { dimension: number; maskable: boolean }> = {
  "192": { dimension: 192, maskable: false },
  "512": { dimension: 512, maskable: false },
  "maskable-192": { dimension: 192, maskable: true },
  "maskable-512": { dimension: 512, maskable: true },
}

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((size) => ({ size }))
}

/**
 * PWA icons. All are full-bleed so the OS can apply its own shape. The
 * maskable ones shrink the bars so they stay inside Android's safe zone (a
 * circle 80% of the icon wide) even under the tightest circular crop.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params
  const { dimension, maskable } = VARIANTS[size] ?? VARIANTS["512"]

  return new ImageResponse(
    <AppIconMark fullBleed scale={maskable ? 0.8 : 1} />,
    { width: dimension, height: dimension },
  )
}
