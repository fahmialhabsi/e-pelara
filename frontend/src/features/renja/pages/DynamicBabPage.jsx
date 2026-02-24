import React, { useState } from "react";
import RenjaBabEditor from "../components/RenjaBabEditor";

const DynamicBabPage = () => {
  const [bab1, setBab1] = useState("Pendahuluan RENJA...");
  const [bab2, setBab2] = useState("Evaluasi RENJA Tahun Lalu...");
  const [bab3, setBab3] = useState("Tujuan dan Sasaran...");
  const [bab4, setBab4] = useState("Rencana Program dan Kegiatan...");

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Editor Dokumen RENJA</h1>
      <RenjaBabEditor babNumber="I" content={bab1} onChange={setBab1} />
      <RenjaBabEditor babNumber="II" content={bab2} onChange={setBab2} />
      <RenjaBabEditor babNumber="III" content={bab3} onChange={setBab3} />
      <RenjaBabEditor babNumber="IV" content={bab4} onChange={setBab4} />
    </div>
  );
};

export default DynamicBabPage;
