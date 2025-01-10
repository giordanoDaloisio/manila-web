import axios from "axios";

let baseURL = "";

if (process.env.NODE_ENV === "development") {
  baseURL = "http://127.0.0.1:5001/";
} else if (process.env.NODE_ENV === "production") {
  baseURL = "https://manila-sobigdata.d4science.org/";
}

const api = axios.create({
  baseURL,
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

export const getStatus = async (id) => {
  const ris = await api.get("/run/" + id);
  return ris;
};

export const downloadModel = async (name) => {
  const ris = await api.get("/model/" + name, {
    responseType: "blob",
  });
  return ris;
};
