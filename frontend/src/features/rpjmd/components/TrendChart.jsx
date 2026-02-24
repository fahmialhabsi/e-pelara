// src/components/TrendChart.jsx
import React from "react";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TrendChart = ({ data }) => {
  if (!data) return null;

  const chartData = {
    labels: data.labels,
    datasets: data.datasets,
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: data.title || "Tren Kinerja RPJMD",
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

export default TrendChart;
