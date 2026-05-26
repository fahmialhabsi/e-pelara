import { useEffect, useRef } from "react";

export function useMrDirtyGuard(isDirty) {
  const isDirtyRef = useRef(isDirty);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);
  useEffect(() => {
    const handler = (e) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "Perubahan belum disimpan. Yakin ingin meninggalkan halaman?";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
}