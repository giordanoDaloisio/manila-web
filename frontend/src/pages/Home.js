import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HOME, RESULT } from "../routes";
import Form from "./Form";
import Results from "./Results";

function Home() {
  const [state, setState] = useState({
    extension: "csv",
    label: "binary",
    index_col: 0,
    has_header: true,
    ml__task: "classification",
    train_size: 80,
    validation: "k_fold",
    K: 10,
    tabular: "tabular",
  });
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path={HOME}
          element={<Form state={state} setState={setState} />}
        />
        <Route path={RESULT} element={<Results />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Home;
