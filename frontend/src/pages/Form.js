import { Box, Button } from "@chakra-ui/react";
import download from "downloadjs";
import { useState } from "react";
import { generate } from "../api";
import Dataset from "../components/Dataset";
import Fairness from "../components/Fairness";
import Metrics from "../components/Metrics";
import MLTask from "../components/MLTask";
import Scaler from "../components/Scaler";

function Form() {
  const [state, setState] = useState({
    extension: "csv",
    label: "binary",
    index_col: 0,
    has_header: true,
    ml__task: "classification",
    train_size: 80,
  });

  const [errorModel, setErrorModel] = useState(false);
  const [errorFair, setErrorFair] = useState(false);
  const [errorMetric, setErrorMetric] = useState(false);

  const handleChangeCheckbox = (e) => {
    if (e.target.checked) {
      const value = e.target.value;
      const state_copy = { ...state };
      state_copy[value] = value;
      setState(state_copy);
    } else {
      setState((currentState) => {
        const copy = { ...currentState };
        delete copy[e.target.value];
        if (e.target.value === "single_sensitive_var") {
          delete copy["variable_name"];
          delete copy["unprivileged_value"];
          delete copy["privileged_value"];
        }
        if (e.target.value === "multiple_sensitive_vars") {
          delete copy["variable_names"];
          delete copy["unprivileged_values"];
          delete copy["privileged_values"];
        }
        return copy;
      });
    }
  };

  const handleChangeRadio = (e) => {
    const value = e.target.value;
    const state_copy = { ...state };
    state_copy[e.target.name] = value;
    setState(state_copy);
  };

  const handleChangeText = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    const state_copy = { ...state };
    state_copy[name] = value;
    setState(state_copy);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const ris = await generate(state);
      download(ris.data, "experiment.zip");
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <Box as='form' m='10px' onSubmit={handleSubmit}>
      <Dataset
        state={state}
        setState={setState}
        handleChangeCheckbox={handleChangeCheckbox}
        handleChangeRadio={handleChangeRadio}
        handleChangeText={handleChangeText}
      />
      <Scaler
        state={state}
        setState={setState}
        handleChangeCheckbox={handleChangeCheckbox}
        handleChangeRadio={handleChangeRadio}
        handleChangeText={handleChangeText}
      />
      <MLTask
        state={state}
        setState={setState}
        handleChangeCheckbox={handleChangeCheckbox}
        handleChangeText={handleChangeText}
        setError={setErrorModel}
      />
      <Fairness
        state={state}
        setState={setState}
        handleChangeCheckbox={handleChangeCheckbox}
        setError={setErrorFair}
      />
      <Metrics
        state={state}
        setState={setState}
        handleChangeCheckbox={handleChangeCheckbox}
        handleChangeRadio={handleChangeRadio}
        setError={setErrorMetric}
      />
      <Button type='submit' isDisabled={errorModel || errorMetric || errorFair}>
        Submit
      </Button>
    </Box>
  );
}

export default Form;
