// src/modules/Modul2_RekapStatistik.js
import React, { useContext, useEffect, useState } from "react";
import { FilterContext } from "../../contexts/FilterContext";
import SummaryCards from "../../features/rpjmd/components/SummaryCards";
import RecapTable from "../../features/rpjmd/components/RecapTable";

export default function RekapStatistik() {
  const { filters } = useContext(FilterContext);
  const [stats] = useState(null);

  useEffect(() => {
    // TODO: fetch recap data berdasarkan filters
    // api.get('/api/rekap', { params: filters }).then(res => setStats(res.data));
  }, [filters]);

  if (!stats) return <p>Loading...</p>;
  return (
    <>
      <SummaryCards data={stats.summary} />
      <RecapTable data={stats.table} />
    </>
  );
}
