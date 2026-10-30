import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export const listExperiments = () => api.get("/experiments").then((r) => r.data);
export const getExperiment = (id) => api.get(`/experiments/${id}`).then((r) => r.data);
export const runExperiment = (config) => api.post("/experiments/run", config).then((r) => r.data);
export const getExperimentStatus = (id) => api.get(`/experiments/${id}/status`).then((r) => r.data);
export const deleteExperiment = (id) => api.delete(`/experiments/${id}`).then((r) => r.data);
export const downloadExperimentArtifact = (id, name) => api.get(`/experiments/${id}/artifacts/${name}`, { responseType: "blob" }).then((r) => r.data);
export const uploadDataset = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/datasets/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};
export const selectBuiltinDataset = (id) => api.post(`/datasets/builtin/${encodeURIComponent(id)}`).then((r) => r.data);
export const analyzeDataset = (datasetId, targetColumn, sensitiveAttributes = []) => api.post("/datasets/analyze", {
  dataset_id: datasetId,
  target_column: targetColumn,
  sensitive_attributes: sensitiveAttributes,
}).then((r) => r.data);
