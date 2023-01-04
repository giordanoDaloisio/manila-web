import {
  Alert,
  AlertDescription,
  AlertIcon,
  Card,
  CardBody,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Radio,
  RadioGroup,
  VStack,
} from "@chakra-ui/react";

import { useOr } from "../hook/useOr";
import Container from "./Container";

function MLTask({
  state,
  setState,
  handleChangeCheckbox,
  handleChangeText,
  setError,
}) {
  const [classCount, handleOrClass] = useOr(handleChangeCheckbox, setError);
  const [regCount, handleOrReg] = useOr(handleChangeCheckbox, setError);

  return (
    <Container title='ML Task'>
      <RadioGroup defaultValue={state.ml__task} name='ml__task' w='full'>
        <HStack align='flex-start'>
          <VStack align='flex-start'>
            <Radio
              value='classification'
              onChange={(e) => {
                const state_copy = { ...state };
                state_copy.ml__task = e.target.value;
                delete state_copy["linear__regression"];
                delete state_copy["svr"];
                delete state_copy["gradient__descent__regressor"];
                delete state_copy["gradient__boosting__regressor"];
                delete state_copy["mlp__regressor"];
                delete state_copy["decision__tree__regressor"];
                setState(state_copy);
              }}>
              Classification
            </Radio>
            <Card w='full'>
              <CardBody>
                <FormControl
                  isDisabled={state.ml__task === "regression"}
                  isInvalid={
                    state.ml__task === "classification" && classCount === 0
                  }>
                  <FormLabel>Classification Methods</FormLabel>
                  <VStack spacing='5px' align='flex-start' w='full' h='full'>
                    {state.ml__task === "classification" && classCount === 0 ? (
                      <Alert status='error'>
                        <AlertIcon />
                        <AlertDescription>
                          Select at least one classifier
                        </AlertDescription>
                      </Alert>
                    ) : (
                      ""
                    )}
                    <Checkbox
                      value='logistic__regression'
                      onChange={handleOrClass}
                      isChecked={state.logistic__regression !== undefined}>
                      Logistic Regression
                    </Checkbox>
                    <Checkbox
                      value='svc'
                      onChange={handleOrClass}
                      isChecked={state.svc !== undefined}>
                      Support Vector Classifier
                    </Checkbox>
                    <Checkbox
                      value='gradient__descent__classifier'
                      onChange={handleOrClass}
                      isChecked={
                        state.gradient__descent__classifier !== undefined
                      }>
                      Gradient Descent Classifier
                    </Checkbox>
                    <Checkbox
                      value='gradient__boosting__classifier'
                      onChange={handleOrClass}
                      isChecked={
                        state.gradient__boosting__classifier !== undefined
                      }>
                      Gradient Boosting Classifier
                    </Checkbox>
                    <Checkbox
                      value='mlp__classifier'
                      onChange={handleOrClass}
                      isChecked={state.mlp__classifier !== undefined}>
                      MLP Classifier
                    </Checkbox>
                    <Checkbox
                      value='decision__tree__classifier'
                      onChange={handleOrClass}
                      isChecked={
                        state.decision__tree__classifier !== undefined
                      }>
                      Decision Tree Classifier
                    </Checkbox>
                    <Checkbox
                      value='random__forest__classifier'
                      onChange={handleOrClass}
                      isChecked={
                        state.random__forest__classifier !== undefined
                      }>
                      Random Forest Classifier
                    </Checkbox>
                  </VStack>
                </FormControl>
              </CardBody>
            </Card>
          </VStack>
          <VStack align='flex-start'>
            <Radio
              value='regression'
              onChange={(e) => {
                const state_copy = { ...state };
                state_copy.ml__task = e.target.value;
                delete state_copy["logistic__regression"];
                delete state_copy["svc"];
                delete state_copy["gradient__descent__classifier"];
                delete state_copy["gradient__boosting__classifier"];
                delete state_copy["mlp__classifier"];
                delete state_copy["decision__tree__classifier"];
                delete state_copy["random__forest__classifier"];
                setState(state_copy);
              }}>
              Regression
            </Radio>
            <Card w='full'>
              <CardBody>
                <FormControl
                  isDisabled={state.ml__task === "classification"}
                  isInvalid={state.ml__task === "regression" && regCount === 0}>
                  <FormLabel>Regression Methods</FormLabel>
                  <VStack spacing='5px' align='flex-start' w='full' h='full'>
                    {state.ml__task === "regression" && regCount === 0 ? (
                      <Alert status='error'>
                        <AlertIcon />
                        <AlertDescription>
                          Select at least one regressor
                        </AlertDescription>
                      </Alert>
                    ) : (
                      ""
                    )}
                    <Checkbox
                      value='linear__regression'
                      onChange={handleOrReg}
                      isChecked={state.linear__regression !== undefined}>
                      Linear Regression
                    </Checkbox>
                    <Checkbox
                      value='svr'
                      onChange={handleOrReg}
                      isChecked={state.svr !== undefined}>
                      Support Vector Regressor
                    </Checkbox>
                    <Checkbox
                      value='gradient__descent__regressor'
                      onChange={handleOrReg}
                      isChecked={
                        state.gradient__descent__regressor !== undefined
                      }>
                      Gradient Descent Regressor
                    </Checkbox>
                    <Checkbox
                      value='gradient__boosting__regressor'
                      onChange={handleOrReg}
                      isChecked={
                        state.gradient__boosting__regressor !== undefined
                      }>
                      Gradient Boosting Regressor
                    </Checkbox>
                    <Checkbox
                      value='mlp__regressor'
                      onChange={handleOrReg}
                      isChecked={state.mlp__regressor !== undefined}>
                      MLP Regressor
                    </Checkbox>
                    <Checkbox
                      value='decision__tree__regressor'
                      onChange={handleOrReg}
                      isChecked={state.decision__tree__regressor !== undefined}>
                      Decision Tree Regressor
                    </Checkbox>
                  </VStack>
                </FormControl>
              </CardBody>
            </Card>
          </VStack>
        </HStack>
      </RadioGroup>
      <Checkbox
        name='save_trained_model'
        onChange={(e) => {
          setState({ ...state, save_trained_model: e.target.checked });
        }}>
        Save Semi-Trained Model
      </Checkbox>
      <FormControl>
        <FormLabel>Train size</FormLabel>
        <Input
          name='train_size'
          value={state.train_size}
          onChange={handleChangeText}
        />
      </FormControl>
    </Container>
  );
}

export default MLTask;
