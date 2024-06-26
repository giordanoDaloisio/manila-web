import {
  Alert,
  AlertDescription,
  AlertIcon,
  Card,
  CardBody,
  Checkbox,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Radio,
  RadioGroup,
  Stack,
  VStack,
} from "@chakra-ui/react";

import Container from "./Container";

function MLTask({
  state,
  setState,
  handleChangeCheckbox,
  handleChangeText,
  errors,
}) {
  return (
    <Container title='ML Task'>
      <RadioGroup defaultValue={state.ml__task} name='ml__task' w='full'>
        <Stack align='flex-start' direction={{ base: "column", lg: "row" }}>
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
                delete state_copy["mean_squared_error"];
                delete state_copy["mean_absolute_error"];
                delete state_copy["r2_error"];
                delete state_copy["mean_squared_logaritmic_error"];
                delete state_copy["mean_absolute_percentage_error"];
                setState(state_copy);
              }}>
              Classification
            </Radio>
            <Card w='full'>
              <CardBody>
                <FormControl
                  isDisabled={state.ml__task === "regression"}
                  isInvalid={
                    state.ml__task === "classification" &&
                    errors.error_model === true
                  }>
                  <FormLabel>Classification Methods</FormLabel>
                  <VStack spacing='5px' align='flex-start' w='full' h='full'>
                    {state.ml__task === "classification" &&
                    errors.error_model === true ? (
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
                      onChange={handleChangeCheckbox}
                      isChecked={state.logistic__regression !== undefined}>
                      Logistic Regression
                    </Checkbox>
                    <Checkbox
                      value='svc'
                      onChange={handleChangeCheckbox}
                      isChecked={state.svc !== undefined}
                      isDisabled={
                        state.ml__task === "regression" ||
                        state.calibrated_eo !== undefined ||
                        state.reject_option_classifier !== undefined
                      }>
                      Support Vector Classifier
                    </Checkbox>
                    {state.calibrated_eo || state.reject_option_classifier ? (
                      <FormHelperText color='darkorange'>
                        Not compatible with Calibrated EO or Reject Option
                        Classifier
                      </FormHelperText>
                    ) : (
                      ""
                    )}
                    <Checkbox
                      value='gradient__descent__classifier'
                      onChange={handleChangeCheckbox}
                      isChecked={
                        state.gradient__descent__classifier !== undefined
                      }
                      isDisabled={
                        state.ml__task === "regression" ||
                        state.calibrated_eo !== undefined ||
                        state.reject_option_classifier !== undefined
                      }>
                      Gradient Descent Classifier
                    </Checkbox>
                    {state.calibrated_eo || state.reject_option_classifier ? (
                      <FormHelperText color='darkorange'>
                        Not compatible with Calibrated EO or Reject Option
                        Classifier
                      </FormHelperText>
                    ) : (
                      ""
                    )}
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
                      isChecked={state.mlp__classifier !== undefined}
                      isInvalid={errors.eg_grid_error}
                      isDisabled={
                        state.ml__task === "regression" ||
                        state.exponentiated_gradient !== undefined ||
                        state.grid_search !== undefined ||
                        state.reweighing !== undefined
                      }>
                      MLP Classifier
                    </Checkbox>
                    {state.ml__task === "classification" &&
                    (state.exponentiated_gradient !== undefined ||
                      state.grid_search !== undefined ||
                      state.reweighing !== undefined) ? (
                      <FormHelperText color='darkorange'>
                        Not compatible with Reweighing or Exponentiated Gradient
                        or Grid Search
                      </FormHelperText>
                    ) : (
                      ""
                    )}
                    {errors.eg_grid_error ? (
                      <FormErrorMessage>
                        Reweighing or Exponentiated Gradient or Grid Search are
                        selected
                      </FormErrorMessage>
                    ) : (
                      ""
                    )}
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
            <FormControl isDisabled={state.fairness}>
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
                  delete state_copy["accuracy"];
                  delete state_copy["precision"];
                  delete state_copy["recall"];
                  delete state_copy["f1_score"];
                  delete state_copy["auc"];
                  delete state_copy["zero_one_loss"];
                  setState(state_copy);
                }}>
                Regression
              </Radio>
              {state.fairness ? (
                <FormHelperText color='darkorange'>
                  Regression task is not compatible with fairness methods
                </FormHelperText>
              ) : (
                ""
              )}
            </FormControl>
            <Card w='full'>
              <CardBody>
                <FormControl
                  isDisabled={state.ml__task === "classification"}
                  isInvalid={
                    state.ml__task === "regression" &&
                    errors.error_model === true
                  }>
                  <FormLabel>Regression Methods</FormLabel>
                  <VStack spacing='5px' align='flex-start' w='full' h='full'>
                    {state.ml__task === "regression" &&
                    errors.error_model === true ? (
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
                      isChecked={state.mlp__regressor !== undefined}
                      isInvalid={errors.eg_grid_error}
                      isDisabled={
                        state.ml__task === "classification" ||
                        state.exponentiated_gradient !== undefined ||
                        state.grid_search !== undefined ||
                        state.reweighing !== undefined
                      }>
                      MLP Regressor
                    </Checkbox>
                    {state.ml__task === "regression" &&
                    (state.exponentiated_gradient !== undefined ||
                      state.grid_search !== undefined ||
                      state.reweighing !== undefined) ? (
                      <FormHelperText color='darkorange'>
                        Not compatible with Reweighing or Exponentiated Gradient
                        or Grid Search
                      </FormHelperText>
                    ) : (
                      ""
                    )}
                    {errors.eg_grid_error ? (
                      <FormErrorMessage>
                        Reweighing or Exponentiated Gradient or Grid Search are
                        selected
                      </FormErrorMessage>
                    ) : (
                      ""
                    )}
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
        </Stack>
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
