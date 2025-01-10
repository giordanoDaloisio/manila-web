import { parseData } from "../utils";

export const useResultData = (results) => {
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
  return { datasets, csvdata };
};
