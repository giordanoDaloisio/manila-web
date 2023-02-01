import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:5000",
  //baseURL: "https://manila.deta.dev/",
});

export const generate = async (data) => {
  const ris = await api.post("/generate", data, {
    responseType: "blob",
  });
  return ris;
};
