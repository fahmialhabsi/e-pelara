// LakipListPage.jsx
import React, { useEffect, useState } from "react";
import { getAllLakip } from "../services/lakipApi";
import LakipTable from "../components/LakipTable";

const LakipListPage = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    getAllLakip().then(setData).catch(console.error);
  }, []);

  return (
    <div>
      <h2>Daftar LAKIP</h2>
      <LakipTable data={data} onEdit={() => {}} onDelete={() => {}} />
    </div>
  );
};

export default LakipListPage;
