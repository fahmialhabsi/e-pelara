// LakipListPage.jsx
import React, { useEffect, useState } from "react";
import { getAllLakip } from "../services/lakipApi";
import LakipTable from "../components/LakipTable";

const LakipListPage = () => {
  const [data, setData] = useState([]);

  const reload = () => {
    getAllLakip().then(setData).catch(console.error);
  };

  useEffect(() => { reload(); }, []);

  return (
    <div>
      <h2>Daftar LAKIP</h2>
      <LakipTable data={data} onEdit={() => {}} onDelete={() => {}} onRefresh={reload} />
    </div>
  );
};

export default LakipListPage;
