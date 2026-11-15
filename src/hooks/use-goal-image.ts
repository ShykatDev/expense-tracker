"use client";

import * as React from "react";

import { loadGoalImage } from "@/lib/goal-images";

/**
 * An object URL for a goal's stored photo, or null while loading / when it
 * has none. The URL is revoked when the id changes or the caller unmounts.
 */
export function useGoalImage(imageId: string | undefined) {
  const [loaded, setLoaded] = React.useState<{ id: string; url: string } | null>(null);

  React.useEffect(() => {
    if (!imageId) return;

    let cancelled = false;
    let url: string | null = null;

    loadGoalImage(imageId)
      .then((blob) => {
        if (cancelled || !blob) return;
        url = URL.createObjectURL(blob);
        setLoaded({ id: imageId, url });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [imageId]);

  return imageId && loaded?.id === imageId ? loaded.url : null;
}
