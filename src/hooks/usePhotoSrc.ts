import { useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getPhotoPath } from '@/api/photos';

// Stored filenames are UUIDs and never reused, so resolved URLs can be cached for the session.
const cache = new Map<string, string>();

export function usePhotoSrc(filename: string | null) {
  const [src, setSrc] = useState<string | null>(filename ? cache.get(filename) ?? null : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!filename) {
      setSrc(null);
      return;
    }
    const cached = cache.get(filename);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;
    setSrc(null);
    getPhotoPath(filename)
      .then((path) => {
        const url = convertFileSrc(path);
        cache.set(filename, url);
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [filename]);

  return { src, failed };
}
