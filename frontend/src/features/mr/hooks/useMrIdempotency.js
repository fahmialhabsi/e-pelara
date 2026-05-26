import { useRef, useCallback } from "react";

/**
 * useMrIdempotency — mencegah double-submit aksi governance kritis.
 * Cara pakai:
 *   const { guard, reset } = useMrIdempotency();
 *   const handleExport = guard(async () => { await doExport(); });
 */
export function useMrIdempotency() {
  const inFlight = useRef(false);

  const guard = useCallback((fn) => async (...args) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      return await fn(...args);
    } finally {
      inFlight.current = false;
    }
  }, []);

  const reset = useCallback(() => { inFlight.current = false; }, []);

  return { guard, reset };
}