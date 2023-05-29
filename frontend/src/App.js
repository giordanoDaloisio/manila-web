import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import Form from "./pages/Form";
import Results from "./pages/Results";
import { HOME, RESULT } from "./routes";

function App() {
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
    <Routes>
      <Route path={HOME} element={<Form state={state} setState={setState}/>} />
      <Route path={RESULT} element={<Results />} />
    </Routes>
  );
}

export default App;
