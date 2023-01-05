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
  Select,
  VStack,
} from "@chakra-ui/react";
import React from "react";
import Container from "./Container";

function Metrics({
  state,
  setState,
  handleChangeCheckbox,
  handleChangeRadio,
  errors,
}) {
  // const [classCount, handleChangeCheckbox] = useOr(handleChangeCheckbox, setErrors);
  // const [regCount, handleChangeCheckbox] = useOr(handleChangeCheckbox, setErrors);
  // const [fairCount, handleChangeCheckbox] = useOr(handleChangeCheckbox, setErrors);
  return (
    <Container title='Metrics'>
      <HStack spacing='5' align='flex-start' w='full'>
        <Card w='full'>
          <CardBody>
            <FormControl
              isDisabled={state.ml__task !== "classification"}
              isInvalid={
                state.ml__task === "classification" && errors.class_metrics
              }>
              {state.ml__task === "classification" && errors.class_metrics ? (
                <Alert status='error'>
                  <AlertIcon />
                  <AlertDescription>
                    Select at least one metric
                  </AlertDescription>
                </Alert>
              ) : (
                ""
              )}
              <FormLabel>Classification Metrics</FormLabel>
              <VStack align='flex-start'>
                <Checkbox
                  value='accuracy'
                  onChange={handleChangeCheckbox}
                  isChecked={state.accuracy !== undefined}>
                  Accuracy
                </Checkbox>
                <Checkbox
                  value='precision'
                  onChange={handleChangeCheckbox}
                  isChecked={state.precision !== undefined}>
                  Precision
                </Checkbox>
                <Checkbox
                  value='recall'
                  onChange={handleChangeCheckbox}
                  isChecked={state.recall !== undefined}>
                  Recall
                </Checkbox>
                <Checkbox
                  value='f1_score'
                  onChange={handleChangeCheckbox}
                  isChecked={state.f1_score !== undefined}>
                  F1Score
                </Checkbox>
                <Checkbox
                  value='auc'
                  onChange={handleChangeCheckbox}
                  isChecked={state.auc !== undefined}>
                  Area Under Curve
                </Checkbox>
                <Checkbox
                  value='zero_one_loss'
                  onChange={handleChangeCheckbox}
                  isChecked={state.zero_one_loss !== undefined}>
                  Zero One Loss
                </Checkbox>
              </VStack>
            </FormControl>
          </CardBody>
        </Card>
        <Card w='full'>
          <CardBody>
            <FormControl
              isDisabled={state.ml__task !== "regression"}
              isInvalid={
                state.ml__task === "regression" && errors.class_metrics
              }>
              {state.ml__task === "regression" && errors.class_metrics ? (
                <Alert status='error'>
                  <AlertIcon />
                  <AlertDescription>
                    Select at least one metric
                  </AlertDescription>
                </Alert>
              ) : (
                ""
              )}
              <FormLabel>Regression Metrics</FormLabel>
              <VStack align='flex-start'>
                <Checkbox
                  value='mean_squared_error'
                  onChange={handleChangeCheckbox}
                  isChecked={state.mean_squared_error !== undefined}>
                  Mean Squared Error
                </Checkbox>
                <Checkbox
                  value='mean_absolute_error'
                  onChange={handleChangeCheckbox}
                  isChecked={state.mean_absolute_error !== undefined}>
                  Mean Absolute Error
                </Checkbox>
                <Checkbox
                  value='r2_error'
                  onChange={handleChangeCheckbox}
                  isChecked={state.r2_error !== undefined}>
                  R2 Error
                </Checkbox>
                <Checkbox
                  value='mean_squared_logaritmic_error'
                  onChange={handleChangeCheckbox}
                  isChecked={state.mean_squared_logaritmic_error !== undefined}>
                  Mean Squared Logaritmic Error
                </Checkbox>
                <Checkbox
                  value='mean_absolute_percentage_error'
                  onChange={handleChangeCheckbox}
                  isChecked={
                    state.mean_absolute_percentage_error !== undefined
                  }>
                  Mean Absolute Percentage Error
                </Checkbox>
              </VStack>
            </FormControl>
          </CardBody>
        </Card>
        <Card w='full'>
          <CardBody>
            <FormControl
              isDisabled={state.fairness === undefined}
              isInvalid={state.fairness && errors.fairmetrics}>
              {state.fairness && errors.fairmetrics ? (
                <Alert status='error'>
                  <AlertIcon />
                  <AlertDescription>
                    Select at least one metric
                  </AlertDescription>
                </Alert>
              ) : (
                ""
              )}
              <FormLabel>Fairness Metrics</FormLabel>
              <VStack align='flex-start'>
                <Checkbox
                  value='statistical_parity'
                  onChange={handleChangeCheckbox}
                  isChecked={state.statistical_parity !== undefined}>
                  Statistical Parity
                </Checkbox>
                <Checkbox
                  value='disparate_impact'
                  onChange={handleChangeCheckbox}
                  isChecked={state.disparate_impact !== undefined}>
                  Disparate Impact
                </Checkbox>
                <Checkbox
                  value='equalized_odds'
                  onChange={handleChangeCheckbox}
                  isChecked={state.equalized_odds !== undefined}>
                  Equalized Odds
                </Checkbox>
                <Checkbox
                  value='average_odds'
                  onChange={handleChangeCheckbox}
                  isChecked={state.average_odds !== undefined}>
                  Average Odds
                </Checkbox>
                <Checkbox
                  value='true_positive_difference'
                  onChange={handleChangeCheckbox}
                  isChecked={state.true_positive_difference !== undefined}>
                  True Positive Difference
                </Checkbox>
                <Checkbox
                  value='false_positive_difference'
                  onChange={handleChangeCheckbox}
                  isChecked={state.false_positive_difference !== undefined}>
                  False Positive Difference
                </Checkbox>
              </VStack>
            </FormControl>
          </CardBody>
        </Card>
      </HStack>
      <HStack>
        <Card w='full'>
          <CardBody>
            <FormControl isInvalid={errors.aggr_metrics}>
              <FormLabel>Aggregation Metrics</FormLabel>
              <VStack align='flex-start' w='full' h='full'>
                {errors.aggr_metrics ? (
                  <Alert status='error'>
                    <AlertIcon />
                    <AlertDescription>
                      Select at least one aggregation function
                    </AlertDescription>
                  </Alert>
                ) : (
                  ""
                )}
                <Checkbox value='min' onChange={handleChangeCheckbox}>
                  Minimum
                </Checkbox>
                <Checkbox value='max' onChange={handleChangeCheckbox}>
                  Maximum
                </Checkbox>
                <Checkbox
                  value='statistical_mean'
                  onChange={handleChangeCheckbox}>
                  Statistical Mean
                </Checkbox>
                <Checkbox value='harmonic_mean' onChange={handleChangeCheckbox}>
                  Harmonic Mean
                </Checkbox>
              </VStack>
            </FormControl>
          </CardBody>
        </Card>
        <FormControl isRequired>
          <VStack align='flex-start'>
            <FormLabel>Select an ordering function</FormLabel>
            <Select name='agg_metric' onChange={handleChangeRadio}>
              <option value='min'>Minimum</option>
              <option value='max'>Maximum</option>
              <option value='statistical_mean'>Statistical Mean</option>
              <option value='harmonic_mean'>Harmonic Mean</option>
            </Select>
          </VStack>
        </FormControl>
      </HStack>
    </Container>
  );
}

export default Metrics;
