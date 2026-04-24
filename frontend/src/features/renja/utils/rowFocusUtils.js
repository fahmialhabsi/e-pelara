export function parseTargetItemIdFromSearch(search = "") {
  const qp = new URLSearchParams(search || "");
  const itemId = Number(qp.get("item"));
  const focus = qp.get("focus");
  const fromFocus = Number(String(focus || "").replace("item-", ""));
  if (Number.isFinite(itemId) && itemId > 0) return itemId;
  if (Number.isFinite(fromFocus) && fromFocus > 0) return fromFocus;
  return null;
}

export function focusRenjaItemRow(itemId) {
  const resolvedId = Number(itemId);
  if (!Number.isFinite(resolvedId) || resolvedId <= 0) return false;
  const el = document.getElementById(`item-${resolvedId}`);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("table-warning");
  window.setTimeout(() => {
    el.classList.remove("table-warning");
  }, 2200);
  return true;
}

