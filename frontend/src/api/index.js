import axios from "axios";

const api = axios.create({
  baseURL: "https://manila-sobigdata.d4science.org/",
});

export const generate = async (data) => {
  const ris = await api.post("/generate", data, {
    responseType: "blob",
  });
  return ris;
};

export const run = async (data, file) => {
  const values = { ...data, dataset: file };
  const ris = await api.post("/run", values, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return ris;
};
