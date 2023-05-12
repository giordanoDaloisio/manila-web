import axios from "axios";
// const api = axios.create({
//   //baseURL: "https://manila-sobigdata.d4science.org/",
//   baseURL: "http://localhost:5000/",
// });

export const generate = async (data) => {
  const ris = await axios.post(
    "https://manila-sobigdata.d4science.org/generate",
    data,
    {
      responseType: "blob",
    }
  );
  return ris;
};

export const run = async (data, file) => {
  const values = { ...data, dataset: file };
  const ris = await axios.post("http://localhost:5000/run", values, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return ris;
};
