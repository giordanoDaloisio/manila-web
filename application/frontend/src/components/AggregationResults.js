import { VStack } from "@chakra-ui/react";
import Container from "./Container";
import DownloadButton from "./DownloadButton";
import ExportButton from "./ExportButton";
import BarChart from "./BarChart";
import DataTableComponent from "./DataTableComponent";
import { downloadCSV } from "../utils";
import { useResultData } from "../hook/useResultData";

function AggregationResults({ model_link, results }) {
  const models = results.models;
  const metrics = results.metrics;
  const { csvdata, datasets } = useResultData(results);
  return (
    <>
      <Container title='Bar Chart'>
        <VStack>
          <DownloadButton name={model_link} buttonLabel='Download Model' />
        </VStack>
        <VStack align='flex-start'>
          <ExportButton
            label='Export Metrics to CSV'
            onExport={() => downloadCSV(csvdata)}
          />
        </VStack>
        <BarChart metrics={metrics} datasets={datasets} />
      </Container>
      <Container title='Raw results'>
        <DataTableComponent models={models} metrics={metrics} />
      </Container>
    </>
  );
}

export default AggregationResults;
