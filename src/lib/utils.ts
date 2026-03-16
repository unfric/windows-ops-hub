import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { lazy } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Enhanced lazy loader that catches deployment mismatches (ChunkLoadError)
 * and forces a page reload to fetch the latest assets.
 */
export function lazyWithRetry(importFn: () => Promise<any>) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (err) {
      console.error("Failed to load chunk, attempting reload...", err);
      // Check if we've already tried to reload to avoid infinite loops
      const hasReloaded = sessionStorage.getItem("chunk_retry_attempted");
      if (!hasReloaded) {
        sessionStorage.setItem("chunk_retry_attempted", "true");
        window.location.reload();
        return { default: () => null }; // Return dummy while reloading
      }
      throw err;
    }
  });
}
