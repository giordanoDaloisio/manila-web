import {
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
import Container from "./Container";

function MLTask({ state, setState, handleChangeCheckbox, handleChangeText }) {
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
            <Card>
              <CardBody>
                <FormControl
                  isDisabled={state.ml__task === "regression"}
                  isRequired={state.ml__task === "classification"}>
                  <FormLabel>Classification Methods</FormLabel>
                  <VStack spacing='5px' align='flex-start' w='full' h='full'>
                    <Checkbox
                      value='logistic__regression'
                      onChange={handleChangeCheckbox}
                      isChecked={state.logistic__regression !== undefined}>
                      Logistic Regression
                    </Checkbox>
                    <Checkbox
                      value='svc'
                      onChange={handleChangeCheckbox}
                      isChecked={state.svc !== undefined}>
                      Support Vector Classifier
                    </Checkbox>
                    <Checkbox
                      value='gradient__descent__classifier'
                      onChange={handleChangeCheckbox}
                      isChecked={
                        state.gradient__descent__classifier !== undefined
                      }>
                      Gradient Descent Classifier
                    </Checkbox>
                    <Checkbox
                      value='gradient__boosting__classifier'
                      onChange={handleChangeCheckbox}
                      isChecked={
                        state.gradient__boosting__classifier !== undefined
                      }>
                      Gradient Boosting Classifier
                    </Checkbox>
                    <Checkbox
                      value='mlp__classifier'
                      onChange={handleChangeCheckbox}
                      isChecked={state.mlp__classifier !== undefined}>
                      MLP Classifier
                    </Checkbox>
                    <Checkbox
                      value='decision__tree__classifier'
                      onChange={handleChangeCheckbox}
                      isChecked={
                        state.decision__tree__classifier !== undefined
                      }>
                      Decision Tree Classifier
                    </Checkbox>
                    <Checkbox
                      value='random__forest__classifier'
                      onChange={handleChangeCheckbox}
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
            <Card>
              <CardBody>
                <FormControl
                  isDisabled={state.ml__task === "classification"}
                  isRequired={state.ml__task === "regression"}>
                  <FormLabel>Regression Methods</FormLabel>
                  <VStack spacing='5px' align='flex-start' w='full' h='full'>
                    <Checkbox
                      value='linear__regression'
                      onChange={handleChangeCheckbox}
                      isChecked={state.linear__regression !== undefined}>
                      Linear Regression
                    </Checkbox>
                    <Checkbox
                      value='svr'
                      onChange={handleChangeCheckbox}
                      isChecked={state.svr !== undefined}>
                      Support Vector Regressor
                    </Checkbox>
                    <Checkbox
                      value='gradient__descent__regressor'
                      onChange={handleChangeCheckbox}
                      isChecked={
                        state.gradient__descent__regressor !== undefined
                      }>
                      Gradient Descent Regressor
                    </Checkbox>
                    <Checkbox
                      value='gradient__boosting__regressor'
                      onChange={handleChangeCheckbox}
                      isChecked={
                        state.gradient__boosting__regressor !== undefined
                      }>
                      Gradient Boosting Regressor
                    </Checkbox>
                    <Checkbox
                      value='mlp__regressor'
                      onChange={handleChangeCheckbox}
                      isChecked={state.mlp__regressor !== undefined}>
                      MLP Regressor
                    </Checkbox>
                    <Checkbox
                      value='decision__tree__regressor'
                      onChange={handleChangeCheckbox}
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
