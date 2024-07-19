import { Table, Tbody, Td, Th, Thead, Tr } from "@chakra-ui/react";
import React from "react";
import { labelMapper, parseData } from "../utils";

function DataTableComponent({ models, metrics, isPareto, paretoData }) {
  const columns = [];
  const data = [];
  for (let i = 0; i < Object.keys(models).length; i++) {
    const key = Object.keys(models)[i];
    columns.push(key);
  }
  for (let i = 0; i < Object.keys(metrics).length; i++) {
    const key = Object.keys(metrics)[i];
    columns.push(key);
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
    data.push(entry);
  }

  return (
    <Table>
      <Thead>
        <Tr>
          {columns.map((column) => (
            <Th key={column}>{labelMapper(column)}</Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {data.map((row) => (
          <Tr
            key={data.indexOf(row)}
            backgroundColor={
              data.indexOf(row) === 0 && !isPareto ? "rgba(0, 200, 0, 0.2)" : ""
            }>
            {columns.map((column) => (
              <Td key={column}>{parseData(row[column])}</Td>
            ))}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

export default DataTableComponent;
