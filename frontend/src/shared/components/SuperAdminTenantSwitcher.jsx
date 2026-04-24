import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Form } from "react-bootstrap";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { normalizeRole } from "../../utils/roleUtils";
import { ACTIVE_TENANT_LS_KEY } from "../../constants/tenantStorage";

function unwrapList(res) {
  const p = res?.data;
  if (p && p.success === true) return p.data;
  return Array.isArray(p) ? p : [];
}

export default function SuperAdminTenantSwitcher() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(() => localStorage.getItem(ACTIVE_TENANT_LS_KEY) || "");

  const isSuper = useMemo(() => normalizeRole(user?.role) === "SUPER_ADMIN", [user?.role]);

  const loadTenants = useCallback(async () => {
    if (!isSuper || !user?.token) return;
    setLoading(true);
    try {
      const res = await api.get("/tenants");
      setTenants(unwrapList(res));
    } catch {
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, [isSuper, user?.token]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  if (!isSuper) return null;

  const onChange = (e) => {
    const v = e.target.value;
    setValue(v);
    if (v) localStorage.setItem(ACTIVE_TENANT_LS_KEY, v);
    else localStorage.removeItem(ACTIVE_TENANT_LS_KEY);
    window.dispatchEvent(new CustomEvent("epelara-tenant-changed", { detail: { tenantId: v } }));
  };

  return (
    <Form.Select
      size="sm"
      value={value}
      onChange={onChange}
      style={{ minWidth: 200, maxWidth: 260 }}
      title="Tenant aktif (hanya SUPER_ADMIN)"
      disabled={loading}
    >
      {loading ? (
        <option value="">Memuat…</option>
      ) : (
        <>
          <option value="">JWT default (tanpa X-Tenant-Id)</option>
          {(tenants || []).map((t) => (
            <option key={t.id} value={String(t.id)}>
              #{t.id} {t.nama} ({t.domain})
            </option>
          ))}
        </>
      )}
    </Form.Select>
  );
}
