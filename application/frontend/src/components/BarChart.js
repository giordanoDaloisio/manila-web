import React from "react";
import { labelMapper } from "../utils";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Colors,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Colors
);

function BarChart({ metrics, datasets }) {
  const data = {
    labels: Object.keys(metrics).map(labelMapper),
    datasets,
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
  };
  return <Bar data={data} options={options} height='100%' />;
}

export default BarChart;
