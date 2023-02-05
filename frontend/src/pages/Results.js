import { Box, useColorModeValue } from "@chakra-ui/react";
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
import { useLocation } from "react-router-dom";
import Container from "../components/Container";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Colors
);

function Results() {
  const loc = useLocation();
  const results = loc.state.results;
  const metrics = results.metrics;
  const models = results.models;
  console.log(results);
  const labels = [];
  if (Object.keys(results.models).includes("fairness_method")) {
    for (let i = 0; i < Object.values(models.model).length; i++) {
      const combo = models.model[i] + "+" + models.fairness_method[i];
      labels.push(combo);
    }
  } else {
    labels.push(Object.values(models.model));
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
  };

  const datasets = [];
  for (let i = 0; i < labels.length; i++) {
    const subdata = [];
    Object.keys(metrics).forEach((k) => {
      subdata.push(metrics[k][i]);
    });
    datasets.push({
      label: labels[i],
      data: subdata,
    });
  }

  const data = {
    labels: Object.keys(metrics).map((value) => {
      if (value === "acc") {
        return "Accuracy";
      }
      if (value === "disp_imp") {
        return "Disparate Impact";
      }
      if (value === "hmean") {
        return "Harmonic Mean";
      }
      if (value === "stat_par") {
        return "Statistical Parity";
      }
      return value;
    }),
    datasets,
  };

  return (
    <Box
      p='60px'
      minH={"100vh"}
      justify={"center"}
      bg={useColorModeValue("gray.50", "gray.800")}>
      <Container title='Metrics'>
        <Bar data={data} options={options} />
      </Container>
      <Container title='Tabular values'></Container>
    </Box>
  );
}

export default Results;
