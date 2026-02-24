import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import api from "../../../services/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TrenKinerjaChart = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchKinerja = async () => {
      try {
        const res = await api.get("/kinerja-rpjmd");
        setData(res.data);
      } catch (error) {
        console.error("Gagal mengambil data kinerja RPJMD:", error);
      }
    };

    fetchKinerja();
  }, []);

  if (!data) return <p>Memuat grafik tren kinerja...</p>;

  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((ds) => ({
      label: ds.label || "Kinerja",
      data: ds.data,
      fill: true,
      backgroundColor: "rgba(54, 162, 235, 0.2)",
      borderColor: "rgba(54, 162, 235, 1)",
      tension: 0.4,
    })),
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: data.title || "Tren Kinerja RPJMD",
      },
    },
  };

  return (
    <div className="mt-5">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default TrenKinerjaChart;
