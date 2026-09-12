"use client";

import { useEffect, useState } from "react";
import { getImage } from "@/lib/store/images";

/**
 * Renders a goal image from IndexedDB. Object URLs are revoked on unmount so
 * browsing a long list of goals does not leak blobs.
 */
export function GoalImage({
  imageId,
  alt,
  className = "",
}: {
  imageId: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;

    getImage(imageId)
      .then((blob) => {
        if (!blob || revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => setUrl(null));

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  if (!url) return null;
  // Blob URLs can't go through next/image, which needs a known loader.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}
