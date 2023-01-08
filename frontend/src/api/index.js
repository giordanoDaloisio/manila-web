import axios from "axios";

const api = axios.create({
  baseURL: "https://manila.deta.dev/",
});

export const generate = async (data) => {
  const ris = await api.post("/generate", data, {
    responseType: "blob",
  });
  return ris;
};
