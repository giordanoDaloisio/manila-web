import { Box, Button, Heading } from "@chakra-ui/react";
import { useState } from "react";
import Dataset from "../components/Dataset";

function Form() {
  const [state, setState] = useState({
    extension: "csv",
    label: "binary",
    index_col: 0,
    has_header: true,
  });

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

  console.log(state);
  return (
    <Box
      as='form'
      m='10px'
      onSubmit={(e) => {
        e.preventDefault();
        console.log(state);
      }}>
      <Heading>Experiment Components</Heading>
      <Dataset
        state={state}
        setState={setState}
        handleChangeCheckbox={handleChangeCheckbox}
        handleChangeRadio={handleChangeRadio}
        handleChangeText={handleChangeText}
      />
      <Button type='submit'>Submit</Button>
    </Box>
  );
}

export default Form;
