import React, { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import { useAuth } from "../../hooks/useAuth";
import { normalizeRole } from "../../utils/roleUtils";
import { ACTIVE_TENANT_LS_KEY } from "../../constants/tenantStorage";
import api from "../../services/api";

function unwrap(res) {
  const p = res?.data;
  if (p && p.success === true) return p.data;
  return p;
}

export default function TenantOverrideBanner() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [overrideId, setOverrideId] = useState("");

  const isSuper = useMemo(() => normalizeRole(user?.role) === "SUPER_ADMIN", [user?.role]);

  const readOverride = useCallback(() => {
    const v = localStorage.getItem(ACTIVE_TENANT_LS_KEY);
    setOverrideId(v && String(v).trim() !== "" ? String(v).trim() : "");
  }, []);

  useEffect(() => {
    readOverride();
    const onStorage = (e) => {
      if (e.key === ACTIVE_TENANT_LS_KEY || e.key == null) readOverride();
    };
    const onCustom = () => readOverride();
    window.addEventListener("storage", onStorage);
    window.addEventListener("epelara-tenant-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("epelara-tenant-changed", onCustom);
    };
  }, [readOverride]);

  const loadTenants = useCallback(async () => {
    if (!isSuper || !user?.token) return;
    try {
      const res = await api.get("/tenants");
      const data = unwrap(res);
      setTenants(Array.isArray(data) ? data : []);
    } catch {
      setTenants([]);
    }
  }, [isSuper, user?.token]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    const onCustom = () => loadTenants();
    window.addEventListener("epelara-tenant-changed", onCustom);
    return () => window.removeEventListener("epelara-tenant-changed", onCustom);
  }, [loadTenants]);

  const label = useMemo(() => {
    if (!overrideId) return "";
    const t = tenants.find((x) => String(x.id) === String(overrideId));
    if (t) return `${t.nama} (#${t.id}, ${t.domain})`;
    return `ID ${overrideId}`;
  }, [overrideId, tenants]);

  if (!isSuper || !overrideId) return null;

  return (
    <Alert severity="warning" sx={{ borderRadius: 0, py: 0.5 }}>
      Mode tenant (override header): <strong>{label}</strong>
      {" — "}
      <span style={{ fontSize: 13 }}>Pilih &quot;JWT default&quot; di dropdown tenant untuk kembali.</span>
    </Alert>
  );
}
