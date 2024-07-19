import { VStack } from "@chakra-ui/react";
import { useResultData } from "../hook/useResultData";
import { downloadCSV } from "../utils";
import Container from "./Container";
import DataTableComponent from "./DataTableComponent";
import DownloadButton from "./DownloadButton";
import ExportButton from "./ExportButton";
import BarChart from "./BarChart";

function ParetoResults({ pareto, model_link, results }) {
  const { datasets, csvdata } = useResultData(pareto);
  const models = results.models;
  const metrics = results.metrics;
  return (
    <>
      <Container title='Pareto Results'>
        <VStack>
          <DownloadButton name={model_link} buttonLabel='Download Models' />
        </VStack>
        <VStack align='flex-start'>
          <ExportButton
            label='Export Metrics to CSV'
            onExport={() => downloadCSV(csvdata)}
          />
        </VStack>

        <BarChart metrics={metrics} datasets={datasets} />

        <DataTableComponent
          models={pareto.models}
          metrics={pareto.metrics}
          isPareto={true}
        />
      </Container>
      <Container title='Full Results'>
        <DataTableComponent models={models} metrics={metrics} isPareto={true} />
      </Container>
    </>
  );
}

export default ParetoResults;
