import {
  Box,
  Stack,
  Table,
  TableCaption,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
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
import ExportButton from "../components/ExportButton";
import { downloadCSV, labelMapper } from "../utils";

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
    labels: Object.keys(metrics).map(labelMapper),
    datasets,
  };

  const csvdata = [];
  for (let i = 0; i < Object.values(models.model).length; i++) {
    let entry = {};
    entry["id"] = i;
    for (let j = 0; j < Object.keys(models).length; j++) {
      const key = Object.keys(models)[j];
      entry[key] = models[key][i];
    }
    for (let j = 0; j < Object.keys(metrics).length; j++) {
      const key = Object.keys(metrics)[j];
      entry[key] = metrics[key][i];
    }
    csvdata.push(entry);
  }

  return (
    <Box
      p='60px'
      minH={"100vh"}
      justify={"center"}
      bg={useColorModeValue("gray.50", "gray.800")}>
      <Container title='Metrics'>
        <VStack align='flex-start'>
          <ExportButton
            label='Export to csv'
            onExport={() => downloadCSV(csvdata)}
          />
        </VStack>
        <Bar data={data} options={options} height='60%' />
      </Container>
      <Container title='How to read the metrics'>
        <Stack
          direction={{ base: "column", sm: "row" }}
          spacing='4'
          align='center'>
          <TableContainer align='center' alignItems='center'>
            <Table variant='simple'>
              <TableCaption>Classification metrics</TableCaption>
              <Thead>
                <Tr>
                  <Th>Metric</Th>
                  <Th>Optimal value</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Accuracy</Td>
                  <Td>1</Td>
                </Tr>
                <Tr>
                  <Td>Precision</Td>
                  <Td>1</Td>
                </Tr>
                <Tr>
                  <Td>Recall</Td>
                  <Td>1</Td>
                </Tr>
                <Tr>
                  <Td>F1Score</Td>
                  <Td>1</Td>
                </Tr>
                <Tr>
                  <Td>Area Under Curve</Td>
                  <Td>1</Td>
                </Tr>
                <Tr>
                  <Td>Zero One Loss</Td>
                  <Td>0</Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
          <TableContainer align='center' alignItems='center'>
            <Table variant='simple'>
              <TableCaption>Regression metrics</TableCaption>
              <Thead>
                <Tr>
                  <Th>Metric</Th>
                  <Th>Optimal value</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Mean Squared Error</Td>
                  <Td>0</Td>
                </Tr>
                <Tr>
                  <Td>Mean Absolute Error</Td>
                  <Td>0</Td>
                </Tr>
                <Tr>
                  <Td>R2 Error</Td>
                  <Td>0</Td>
                </Tr>
                <Tr>
                  <Td>Mean Squared Logaritmic Error</Td>
                  <Td>0</Td>
                </Tr>
                <Tr>
                  <Td>Mean Absolute Percentage Error</Td>
                  <Td>0</Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
          <TableContainer align='center' alignItems='center'>
            <Table variant='simple'>
              <TableCaption>Fairness metrics</TableCaption>
              <Thead>
                <Tr>
                  <Th>Metric</Th>
                  <Th>Optimal value</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Euclidean Distance</Td>
                  <Td>0</Td>
                </Tr>
                <Tr>
                  <Td>Manhattan Distance</Td>
                  <Td>0</Td>
                </Tr>
                <Tr>
                  <Td>Mahalanobis Distance</Td>
                  <Td>0</Td>
                </Tr>
                <Tr>
                  <Td>Statistical Parity</Td>
                  <Td>0</Td>
                </Tr>
                <Tr>
                  <Td>Disparate Impact</Td>
                  <Td>1</Td>
                </Tr>
                <Tr>
                  <Td>Equalized Odds Difference</Td>
                  <Td>0</Td>
                </Tr>
                <Tr>
                  <Td>Average Odds Difference</Td>
                  <Td>0</Td>
                </Tr>
                <Tr>
                  <Td>True Positive Difference</Td>
                  <Td>0</Td>
                </Tr>
                <Tr>
                  <Td>False Positive Difference</Td>
                  <Td>0</Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
        </Stack>
      </Container>
    </Box>
  );
}

export default Results;
