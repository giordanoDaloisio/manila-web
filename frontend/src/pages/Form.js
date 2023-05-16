import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormHelperText,
  Heading,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import FilePicker from "chakra-ui-file-picker";
import download from "downloadjs";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { generate, run } from "../api";
import Container from "../components/Container";
import Dataset from "../components/Dataset";
import Fairness from "../components/Fairness";
import Metrics from "../components/Metrics";
import MLTask from "../components/MLTask";
import Scaler from "../components/Scaler";
import Validation from "../components/Validation";
import { useValidation } from "../hook/useValidation";
import { RESULT } from "../routes";

function Form() {
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
  const [file, setFile] = useState(null);
  const [networkError, setNetworkError] = useState("");
  const [isRunLoading, setIsRunLoading] = useState(false);
  const [isGenLoading, setIsGenLoading] = useState(false);
  const [fetchedData, setFetchedData] = useState(null);
  const [fileError, setFileError] = useState("");

  const errors = useValidation(state);
  const navigate = useNavigate();

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
        if (e.target.value === "individual") {
          delete copy["euclidean_distance"];
          delete copy["manhattan_distance"];
          delete copy["mahalanobis_distance"];
        }
        if (e.target.value === "group_metric") {
          delete copy["equal"];
          delete copy["proportional"];
          delete copy["other"];
          delete copy["statistical_parity"];
          delete copy["disparate_impact"];
          delete copy["equalized_odds"];
          delete copy["average_odds"];
          delete copy["true_positive_difference"];
          delete copy["false_positive_difference"];
        }
        if (e.target.value === "equal") {
          delete copy["statistical_parity"];
          delete copy["disparate_impact"];
        }
        if (e.target.value === "proportional") {
          delete copy["equalized_odds"];
          delete copy["average_odds"];
        }
        if (e.target.value === "other") {
          delete copy["true_positive_difference"];
          delete copy["false_positive_difference"];
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

  const handleChangeFile = (files) => {
    if (files.length > 0) {
      if (Math.floor(files[0].size / 1024) > 10000) {
        setFileError("The file is too big. The maximum size is 10MB.");
      } else {
        setFileError("");
        setFile(files[0]);
      }
    } else {
      setFileError("");
      setFile(null);
    }
  };

  const handleRun = async (e) => {
    e.preventDefault();
    try {
      setNetworkError("");
      setIsRunLoading(true);
      const ris = await run(state, file);
      const data = ris.data;
      setFetchedData(data);
    } catch (exc) {
      console.log(exc);
      exc.response && exc.response.data && exc.response.data.error
        ? setNetworkError(exc.response.data.error)
        : setNetworkError(exc.message);
    }
    setIsRunLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsGenLoading(true);
      const ris = await generate(state);
      download(ris.data, "experiment.zip");
    } catch (e) {
      console.log(e);
    }
    setIsGenLoading(false);
  };

  useEffect(() => {
    if (fetchedData !== null) {
      navigate(RESULT, {
        state: fetchedData,
      });
    }
  }, [fetchedData]);

  return (
    <Box
      as='form'
      p='60px'
      onSubmit={handleSubmit}
      minH={"100vh"}
      justify={"center"}
      bg={useColorModeValue("gray.50", "gray.800")}>
      <VStack>
        <Heading>MANILA</Heading>
        <Text>Select the features that comprise your experiment</Text>
      </VStack>
      <Dataset
        state={state}
        setState={setState}
        handleChangeCheckbox={handleChangeCheckbox}
        handleChangeRadio={handleChangeRadio}
        handleChangeText={handleChangeText}
        errors={errors}
      />
      <Scaler
        state={state}
        setState={setState}
        handleChangeCheckbox={handleChangeCheckbox}
        handleChangeRadio={handleChangeRadio}
        handleChangeText={handleChangeText}
        errors={errors}
      />
      <MLTask
        state={state}
        setState={setState}
        handleChangeCheckbox={handleChangeCheckbox}
        handleChangeText={handleChangeText}
        errors={errors}
      />
      <Fairness
        state={state}
        setState={setState}
        handleChangeCheckbox={handleChangeCheckbox}
        errors={errors}
      />
      <Metrics
        state={state}
        setState={setState}
        handleChangeCheckbox={handleChangeCheckbox}
        handleChangeRadio={handleChangeRadio}
        errors={errors}
      />
      <Validation
        state={state}
        handleChangeRadio={handleChangeRadio}
        setState={setState}
      />
      {/* <Presentation
        state={state}
        handleChangeCheckbox={handleChangeCheckbox}
        errors={errors}
      /> */}
      <Container title='Upload dataset'>
        <FormControl>
          <FilePicker
            type='file'
            value={file}
            onFileChange={handleChangeFile}
            placeholder='The file extension must be the same as above'
          />
          <FormHelperText>
            Upload a file if you want to run the experiment on the server (the
            file extension must be the same as above).
          </FormHelperText>
          {fileError !== "" ? (
            <Alert status='error'>
              <AlertIcon />
              {fileError}
            </Alert>
          ) : (
            ""
          )}
        </FormControl>
      </Container>
      {networkError !== "" ? (
        <Alert status='error'>
          <AlertIcon />
          {networkError}
        </Alert>
      ) : (
        ""
      )}
      {isRunLoading ? (
        <Alert status='info'>
          <AlertIcon />
          The experiment is running. Please wait.
        </Alert>
      ) : (
        ""
      )}
      <FormControl align='center'>
        <Button
          colorScheme='teal'
          type='submit'
          name='generate'
          isLoading={isGenLoading}
          isDisabled={
            Object.values(errors).filter((v) => v === true).length !== 0
          }
          ml='2'>
          Generate Code
        </Button>
        <Button
          colorScheme='telegram'
          name='run'
          isLoading={isRunLoading}
          isDisabled={
            Object.values(errors).filter((v) => v === true).length !== 0 ||
            file === null ||
            fileError !== ""
          }
          ml='2'
          onClick={handleRun}>
          Run the experiment
        </Button>
      </FormControl>
    </Box>
  );
}

export default Form;
