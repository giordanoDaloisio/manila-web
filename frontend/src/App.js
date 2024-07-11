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
    weight_accuracy: 1.0,
    weight_precision: 1.0,
    weight_recall: 1.0,
    weight_f1_score: 1.0,
    weight_auc: 1.0,
    weight_zero_one_loss: 1.0,
    weight_euclidean_distance: 1.0,
    weight_manhattan_distance: 1.0,
    weight_mahalanobis_distance: 1.0,
    weight_stat_par: 1.0,
    weight_disp_imp: 1.0,
    weight_eq_odds: 1.0,
    weight_ao: 1.0,
    weight_tp_diff: 1.0,
    weight_fp_diff: 1.0,
  });

  return (
    <Routes>
      <Route path={HOME} element={<Form state={state} setState={setState} />} />
      <Route path={RESULT} element={<Results />} />
    </Routes>
  );
}

export default App;
