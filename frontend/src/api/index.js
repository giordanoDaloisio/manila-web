import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
});

export const generate = async (data) => {
  const ris = await api.post("/generate", data, {
    responseType: "blob",
  });
  return ris;
};
