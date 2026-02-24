// src/services/periodeService.js
// services/periodeService.js
import api from "./api";

export const getCurrentPeriode = () =>
  api.get("/periode-rpjmd/active").then((res) => res.data);
