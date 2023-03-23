import {
  Box,
  Heading,
  Highlight,
  ListItem,
  Text,
  UnorderedList,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";

import { useLocation } from "react-router-dom";
import BarChart from "../components/BarChart";
import Container from "../components/Container";
import DataTableComponent from "../components/DataTableComponent";
import ExportButton from "../components/ExportButton";
import { downloadCSV, parseData } from "../utils";

function Results() {
  const loc = useLocation();
  const results = loc.state.results;
  const metrics = results.metrics;
  const models = results.models;
  const labels = [];
  const datasets = [];
  const csvdata = [];

  if (Object.keys(results.models).includes("fairness_method")) {
    for (let i = 0; i < Object.values(models.model).length; i++) {
      const combo =
        parseData(models.model[i]) + "+" + parseData(models.fairness_method[i]);
      labels.push(combo);
    }
  } else {
    labels.push(Object.values(models.model));
  }

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
      <Heading align='center' pb={6}>
        Results
      </Heading>
      <Container title='Bar Chart'>
        <VStack align='flex-start'>
          <ExportButton
            label='Export to csv'
            onExport={() => downloadCSV(csvdata)}
          />
        </VStack>
        <BarChart metrics={metrics} datasets={datasets} />
      </Container>
      <Container title='Raw results'>
        <DataTableComponent models={models} metrics={metrics} />
      </Container>
      <Container title='How to read the metrics'>
        <UnorderedList>
          <ListItem>
            <Text as='b'>Classification Metrics</Text>
            <Text>
              These metrics are used to evaluate the performance of a
              classification and have an optimal value equal to{" "}
              <Text as='b'>one</Text>.
            </Text>
            <Text>
              The only exception is <Text as='b'>Zero One Loss</Text> which has
              an optimal value equal to <Text as='b'>zero</Text>.
            </Text>
          </ListItem>
          <ListItem>
            <Text as='b'>Regression Metrics</Text>
            <Text>
              These metrics measure the error of the predictions of the model
              and have an optimal value equal to <Text as='b'>zero</Text>.
            </Text>
          </ListItem>
          <ListItem>
            <Text as='b'>Fairness Metrics</Text>
            <Text>
              These metrics measure the fairness of the predictions of the model
              and have an optimal value equal to <Text as='b'>zero</Text>.
            </Text>
            <Text>
              The only exception is <Text as='b'>Disparate Impact</Text> which
              has an optimal value equal to <Text as='b'>one</Text>.
            </Text>
          </ListItem>
        </UnorderedList>
      </Container>
    </Box>
  );
}

export default Results;
