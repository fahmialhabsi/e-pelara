const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const normalizeId = (value) =>
  value === null || value === undefined ? "" : String(value);

export const extractListData = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

export const extractListMeta = (payload) => {
  if (isPlainObject(payload?.meta)) return payload.meta;
  if (isPlainObject(payload?.data?.meta)) return payload.data.meta;

  const pag = payload?.pagination ?? payload?.data?.pagination;
  if (isPlainObject(pag) && pag.total != null) {
    const total = Number(pag.total);
    const totalPages = Math.max(
      1,
      Number(pag.totalPages) ||
        Math.ceil(total / Math.max(1, Number(pag.perPage) || 1))
    );
    return {
      totalItems: total,
      totalPages,
      currentPage: Number(pag.currentPage) || 1,
    };
  }

  if (typeof payload?.totalData === "number") {
    return {
      totalItems: payload.totalData,
      totalPages: payload.totalPages ?? 1,
      currentPage: payload.currentPage ?? 1,
    };
  }

  return {};
};

export const normalizeListItems = (payload) =>
  extractListData(payload)
    .filter((item) => Boolean(item))
    .map((item) =>
      isPlainObject(item) ? { ...item, id: normalizeId(item.id) } : item,
    );

export const extractListResponse = (payload) => ({
  data: normalizeListItems(payload),
  meta: extractListMeta(payload),
});

export const extractSingleData = (payload) => {
  if (!isPlainObject(payload)) return payload;
  if (payload.data !== undefined && !Array.isArray(payload.data)) {
    return payload.data;
  }
  return payload;
};
