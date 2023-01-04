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
import { useOr } from "../hook/useOr";
import Container from "./Container";

function Metrics({
  state,
  setState,
  handleChangeCheckbox,
  handleChangeRadio,
  setError,
}) {
  const [classCount, handleOrClass] = useOr(handleChangeCheckbox, setError);
  const [regCount, handleOrReg] = useOr(handleChangeCheckbox, setError);
  const [fairCount, handleOrFair] = useOr(handleChangeCheckbox, setError);
  return (
    <Container title='Metrics'>
      <HStack spacing='5' align='flex-start' w='full'>
        <Card w='full'>
          <CardBody>
            <FormControl
              isDisabled={state.ml__task !== "classification"}
              isInvalid={
                state.ml__task === "classification" && classCount === 0
              }>
              {state.ml__task === "classification" && classCount === 0 ? (
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
                  onChange={handleOrClass}
                  isChecked={state.accuracy !== undefined}>
                  Accuracy
                </Checkbox>
                <Checkbox
                  value='precision'
                  onChange={handleOrClass}
                  isChecked={state.precision !== undefined}>
                  Precision
                </Checkbox>
                <Checkbox
                  value='recall'
                  onChange={handleOrClass}
                  isChecked={state.recall !== undefined}>
                  Recall
                </Checkbox>
                <Checkbox
                  value='f1_score'
                  onChange={handleOrClass}
                  isChecked={state.f1_score !== undefined}>
                  F1Score
                </Checkbox>
                <Checkbox
                  value='auc'
                  onChange={handleOrClass}
                  isChecked={state.auc !== undefined}>
                  Area Under Curve
                </Checkbox>
                <Checkbox
                  value='zero_one_loss'
                  onChange={handleOrClass}
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
              isInvalid={(state.ml__task === "regression") & (regCount === 0)}>
              {state.ml__task === "regression" && regCount === 0 ? (
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
                  onChange={handleOrReg}
                  isChecked={state.mean_squared_error !== undefined}>
                  Mean Squared Error
                </Checkbox>
                <Checkbox
                  value='mean_absolute_error'
                  onChange={handleOrReg}
                  isChecked={state.mean_absolute_error !== undefined}>
                  Mean Absolute Error
                </Checkbox>
                <Checkbox
                  value='r2_error'
                  onChange={handleOrReg}
                  isChecked={state.r2_error !== undefined}>
                  R2 Error
                </Checkbox>
                <Checkbox
                  value='mean_squared_logaritmic_error'
                  onChange={handleOrReg}
                  isChecked={state.mean_squared_logaritmic_error !== undefined}>
                  Mean Squared Logaritmic Error
                </Checkbox>
                <Checkbox
                  value='mean_absolute_percentage_error'
                  onChange={handleOrReg}
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
              isInvalid={state.fairness && fairCount === 0}>
              {state.fairness && fairCount === 0 ? (
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
                  onChange={handleOrFair}
                  isChecked={state.statistical_parity !== undefined}>
                  Statistical Parity
                </Checkbox>
                <Checkbox
                  value='disparate_impact'
                  onChange={handleOrFair}
                  isChecked={state.disparate_impact !== undefined}>
                  Disparate Impact
                </Checkbox>
                <Checkbox
                  value='equalized_odds'
                  onChange={handleOrFair}
                  isChecked={state.equalized_odds !== undefined}>
                  Equalized Odds
                </Checkbox>
                <Checkbox
                  value='average_odds'
                  onChange={handleOrFair}
                  isChecked={state.average_odds !== undefined}>
                  Average Odds
                </Checkbox>
                <Checkbox
                  value='true_positive_difference'
                  onChange={handleOrFair}
                  isChecked={state.true_positive_difference !== undefined}>
                  True Positive Difference
                </Checkbox>
                <Checkbox
                  value='false_positive_difference'
                  onChange={handleOrFair}
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
            <FormControl isRequired={state.fairness || state.ml__task}>
              <FormLabel>Aggregation Metrics</FormLabel>
              <VStack align='flex-start' w='full' h='full'>
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
        <Select
          placeholder='Ordering function'
          required
          name='agg_metric'
          onChange={handleChangeRadio}>
          <option value='min'>Minimum</option>
          <option value='max'>Maximum</option>
          <option value='statistical_mean'>Statistical Mean</option>
          <option value='harmonic mean'>Harmonic Mean</option>
        </Select>
      </HStack>
    </Container>
  );
}

export default Metrics;
