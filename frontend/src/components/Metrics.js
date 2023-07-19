import {
  Alert,
  AlertDescription,
  AlertIcon,
  Card,
  CardBody,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  ListItem,
  OrderedList,
  Radio,
  Stack,
  Text,
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
  const handleChangeMetrics = (e) => {
    const state_copy = { ...state };
    const value = e.target.value;
    if (e.target.checked) {
      state_copy[value] = value;
      if (value === "statistical_mean") {
        state_copy["agg_metric"] = "mean";
      } else if (value === "harmonic_mean") {
        state_copy["agg_metric"] = "hmean";
      } else {
        state_copy["agg_metric"] = value;
      }
    } else {
      delete state_copy[e.target.value];
      if (
        value === state_copy["agg_metric"] ||
        (value === "statistical_mean" && state_copy["agg_metric"] === "mean") ||
        (value === "harmonic_mean" && state_copy["agg_metric"] === "hmean")
      ) {
        delete state_copy["agg_metric"];
      }
    }
    setState(state_copy);
  };
  return (
    <Container title='Metrics'>
      <Stack
        spacing='5'
        align='center'
        w='full'
        p='0 20px'
        //direction={{ base: "column", lg: "row" }}
      >
        <Card w='full'>
          <CardBody>
            <FormControl
              isDisabled={state.ml__task !== "classification"}
              isInvalid={
                state.ml__task === "classification" && errors.class_metrics
              }>
              <FormLabel>Classification Metrics</FormLabel>
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
                  isChecked={state.auc !== undefined}
                  isDisabled={state.label === "multiclass"}>
                  Area Under Curve
                </Checkbox>
                {state.label === "multiclass" ? (
                  <FormHelperText color='darkorange'>
                    Not compatible with Multi Class label
                  </FormHelperText>
                ) : (
                  ""
                )}
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
              <FormLabel>Regression Metrics</FormLabel>
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
        {state.fairness !== undefined ? (
          <Card w='full'>
            <CardBody>
              <FormControl
                isDisabled={state.fairness === undefined}
                isInvalid={errors.fair_metric_err}>
                <FormLabel>Fairness Metrics</FormLabel>
                {errors.fair_metric_err ? (
                  <Alert status='error'>
                    <AlertIcon />
                    <AlertDescription>
                      Select at least one metric
                    </AlertDescription>
                  </Alert>
                ) : (
                  ""
                )}
                <VStack align='flex-start' pl='4' spacing='20px'>
                  <OrderedList mt='2'>
                    <ListItem>
                      <Text>
                        Are you dealing with bias on{" "}
                        <Text as='b'>individuals</Text> (similar individuals
                        should be treated similarly) ,{" "}
                        <Text as='b'>groups</Text> (individuals of a group
                        should not be discriminated)?
                      </Text>
                    </ListItem>
                    <VStack align='flex-start'>
                      <Checkbox
                        name='individual'
                        value='individual'
                        onChange={handleChangeCheckbox}
                        isChecked={state.individual !== undefined}
                        isDisabled={state.fairness === undefined}
                        mt='2'>
                        Individual
                      </Checkbox>
                      {state.individual === "individual" ? (
                        <VStack pl='4' align='flex-start' spacing='2'>
                          <FormControl>
                            {/* <Alert status='error'>
                              <AlertIcon />
                              These metrics are not implemented yet
                            </Alert> */}
                            <Checkbox
                              value='euclidean_distance'
                              onChange={handleChangeCheckbox}
                              isChecked={
                                state.euclidean_distance !== undefined
                              }>
                              Euclidean Distance
                            </Checkbox>
                            <FormHelperText>0 means fairness</FormHelperText>
                            <Checkbox
                              value='manhattan_distance'
                              onChange={handleChangeCheckbox}
                              isChecked={
                                state.manhattan_distance !== undefined
                              }>
                              Manhattan Distance
                            </Checkbox>
                            <FormHelperText>0 means fairness</FormHelperText>
                            <Checkbox
                              value='mahalanobis_distance'
                              onChange={handleChangeCheckbox}
                              isChecked={
                                state.mahalanobis_distance !== undefined
                              }>
                              Mahalanobis Distance
                            </Checkbox>
                            <FormHelperText>0 means fairness</FormHelperText>
                          </FormControl>
                        </VStack>
                      ) : (
                        ""
                      )}
                      <Checkbox
                        name='group_metric'
                        value='group_metric'
                        onChange={handleChangeCheckbox}
                        isChecked={state.group_metric !== undefined}
                        isDisabled={state.fairness === undefined}
                        mt='2'>
                        Group
                      </Checkbox>
                      {state.group_metric === "group_metric" ? (
                        <Stack pl='4'>
                          <ListItem>
                            <Text>
                              Should different groups be treated{" "}
                              <Text as='b'>equally</Text> (everyone should have
                              the same probability of receiving a positive
                              label), <Text as='b'>proportionally</Text>{" "}
                              (everyone should get a positive label only if the
                              evidence tells that), or <Text as='b'>other</Text>
                              ?
                            </Text>
                          </ListItem>
                          <VStack align='flex-start'>
                            <Checkbox
                              name='equal'
                              value='equal'
                              onChange={handleChangeCheckbox}
                              isChecked={state.equal === "equal"}
                              isDisabled={state.fairness === undefined}
                              mt='2'>
                              Equally
                            </Checkbox>
                            {state.equal === "equal" ? (
                              <VStack pl='4' align='flex-start'>
                                <Checkbox
                                  value='statistical_parity'
                                  onChange={handleChangeCheckbox}
                                  isChecked={
                                    state.statistical_parity !== undefined
                                  }>
                                  Statistical Parity
                                </Checkbox>
                                <FormHelperText>
                                  0 means fairness
                                </FormHelperText>
                                <Checkbox
                                  value='disparate_impact'
                                  onChange={handleChangeCheckbox}
                                  isChecked={
                                    state.disparate_impact !== undefined
                                  }>
                                  Disparate Impact
                                </Checkbox>
                                <FormHelperText>
                                  1 means fairness
                                </FormHelperText>
                              </VStack>
                            ) : (
                              ""
                            )}
                            <Checkbox
                              name='proportional'
                              value='proportional'
                              onChange={handleChangeCheckbox}
                              isChecked={state.proportional === "proportional"}
                              isDisabled={state.fairness === undefined}
                              mt='2'>
                              Proportionally
                            </Checkbox>
                            {state.proportional === "proportional" ? (
                              <VStack pl='4' align='flex-start'>
                                <Checkbox
                                  value='equalized_odds'
                                  onChange={handleChangeCheckbox}
                                  isChecked={
                                    state.equalized_odds !== undefined
                                  }>
                                  Equalized Odds Difference
                                </Checkbox>
                                <FormHelperText>
                                  0 means fairness
                                </FormHelperText>
                                <Checkbox
                                  value='average_odds'
                                  onChange={handleChangeCheckbox}
                                  isChecked={state.average_odds !== undefined}>
                                  Average Odds Difference
                                </Checkbox>
                                <FormHelperText>
                                  0 means fairness
                                </FormHelperText>
                              </VStack>
                            ) : (
                              ""
                            )}
                            <Checkbox
                              name='other'
                              value='other'
                              onChange={handleChangeCheckbox}
                              isChecked={state.other === "other"}
                              isDisabled={state.fairness === undefined}
                              mt='2'>
                              Other
                            </Checkbox>
                            {state.other === "other" ? (
                              <VStack pl='4' align='flex-start'>
                                <Checkbox
                                  value='true_positive_difference'
                                  onChange={handleChangeCheckbox}
                                  isChecked={
                                    state.true_positive_difference !== undefined
                                  }>
                                  True Positive Difference
                                </Checkbox>
                                <FormHelperText>
                                  0 means fairness
                                </FormHelperText>
                                <Checkbox
                                  value='false_positive_difference'
                                  onChange={handleChangeCheckbox}
                                  isChecked={
                                    state.false_positive_difference !==
                                    undefined
                                  }>
                                  False Positive Difference
                                </Checkbox>
                                <FormHelperText>
                                  0 means fairness
                                </FormHelperText>
                              </VStack>
                            ) : (
                              ""
                            )}
                          </VStack>
                        </Stack>
                      ) : (
                        ""
                      )}
                    </VStack>
                  </OrderedList>
                </VStack>
              </FormControl>
            </CardBody>
          </Card>
        ) : (
          ""
        )}
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
                <Checkbox
                  value='min'
                  onChange={handleChangeMetrics}
                  isChecked={state.min !== undefined}>
                  Minimum
                </Checkbox>
                <Radio
                  name='agg_metric'
                  value='min'
                  onChange={handleChangeRadio}
                  isChecked={state.agg_metric === "min"}
                  isDisabled={state.min === undefined}
                  pl='6'>
                  Order metrics with this function
                </Radio>
                <Checkbox
                  value='max'
                  onChange={handleChangeMetrics}
                  isChecked={state.max !== undefined}>
                  Maximum
                </Checkbox>
                <Radio
                  name='agg_metric'
                  value='max'
                  onChange={handleChangeRadio}
                  isDisabled={state.max === undefined}
                  isChecked={state.agg_metric === "max"}
                  pl='6'>
                  Order metrics with this function
                </Radio>
                <Checkbox
                  value='statistical_mean'
                  onChange={handleChangeMetrics}
                  isChecked={state.statistical_mean !== undefined}>
                  Statistical Mean
                </Checkbox>
                <Radio
                  name='agg_metric'
                  value='mean'
                  onChange={handleChangeRadio}
                  isChecked={state.agg_metric === "mean"}
                  isDisabled={state.statistical_mean === undefined}
                  pl='6'>
                  Order metrics with this function
                </Radio>
                <Checkbox
                  value='harmonic_mean'
                  onChange={handleChangeMetrics}
                  isChecked={state.harmonic_mean !== undefined}>
                  Harmonic Mean
                </Checkbox>
                <Radio
                  name='agg_metric'
                  value='hmean'
                  onChange={handleChangeRadio}
                  isChecked={state.agg_metric === "hmean"}
                  isDisabled={state.harmonic_mean === undefined}
                  pl='6'>
                  Order metrics with this function
                </Radio>
              </VStack>
            </FormControl>
          </CardBody>
        </Card>
      </Stack>
    </Container>
  );
}

export default Metrics;
