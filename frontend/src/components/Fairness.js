import {
  Alert,
  AlertDescription,
  AlertIcon,
  Checkbox,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import Container from "./Container";

function Fairness({ state, setState, handleChangeCheckbox, errors }) {
  return (
    <Container title='Quality Methods'>
      <FormControl>
        <Checkbox
          value='fairness'
          onChange={handleChangeCheckbox}
          isDisabled={state.ml__task === "regression"}>
          Fairness
        </Checkbox>
        {state.ml__task === "regression" ? (
          <Alert status='error'>
            <AlertIcon />
            <AlertDescription>
              Fairness Methods are not compatible with regression tasks
            </AlertDescription>
          </Alert>
        ) : (
          ""
        )}
      </FormControl>
      {state.fairness ? (
        <Stack pl='6'>
          <FormControl
            isDisabled={errors.error_sensvars === true}
            isInvalid={
              (state.single_sensitive_var || state.multiple_sensitive_vars) &&
              errors.errors_fairmethods
            }>
            {(state.single_sensitive_var || state.multiple_sensitive_vars) &&
            errors.errors_fairmethods ? (
              <Alert status='error'>
                <AlertIcon />
                <AlertDescription>
                  Select at least one fairness method
                </AlertDescription>
              </Alert>
            ) : (
              ""
            )}
            {errors.error_sensvars ? (
              <Alert status='error'>
                <AlertIcon />
                <AlertDescription>
                  Specify the sensitive variables
                </AlertDescription>
              </Alert>
            ) : (
              ""
            )}
            <Checkbox
              value='no__method'
              isChecked={state.no__method !== undefined}
              onChange={handleChangeCheckbox}>
              No Method
            </Checkbox>
            <FormLabel size='md' m='10px 0px'>
              Pre Processing
              <br />
              These methods work on the training dataset to reduce its intrinsic
              bias
            </FormLabel>
            <VStack pl='6' align='flex-start' spacing='10px'>
              <Checkbox
                value='reweighing'
                onChange={handleChangeCheckbox}
                checked={state.reweighing !== undefined}
                isInvalid={errors.eg_grid_error}
                isDisabled={
                  errors.error_sensvars === true ||
                  state.mlp__classifier !== undefined ||
                  state.mlp__regressor !== undefined ||
                  state.label === "multiclass"
                }>
                Reweighing
              </Checkbox>
              {state.mlp__classifier !== undefined ||
              state.mlp__regressor !== undefined ? (
                <FormHelperText color='darkorange'>
                  Not compatible with MLP Classifier or MLP Regressor
                </FormHelperText>
              ) : (
                ""
              )}
              {state.label === "multiclass" ? (
                <FormHelperText color='darkorange'>
                  Not compatible with Multi Class label
                </FormHelperText>
              ) : (
                ""
              )}
              {errors.eg_grid_error ? (
                <FormErrorMessage>
                  MLP Classifier or MLP Regressor are selected
                </FormErrorMessage>
              ) : (
                ""
              )}
              <Checkbox
                value='dir'
                onChange={handleChangeCheckbox}
                checked={state.dir !== undefined}
                isDisabled={
                  errors.error_sensvars === true ||
                  state.multiple_sensitive_vars ||
                  state.label === "multiclass"
                }>
                DIR
              </Checkbox>
              {state.label === "multiclass" ? (
                <FormHelperText color='darkorange'>
                  Not compatible with Multi Class label
                </FormHelperText>
              ) : (
                ""
              )}
              {state.multiple_sensitive_vars ? (
                <FormHelperText color='darkorange'>
                  Not compatible with multiple sensitive variables
                </FormHelperText>
              ) : (
                ""
              )}
              <Checkbox
                value='demv'
                onChange={handleChangeCheckbox}
                checked={state.demv !== undefined}>
                DEMV
              </Checkbox>
            </VStack>
            <FormLabel size='md' m='10px 0px'>
              In Processing
              <br />
              These methods work on the ML algorithm modifying its learning
              process to reduce the learned bias
            </FormLabel>
            <Text></Text>
            <VStack pl='6' align='flex-start' spacing='10px'>
              <Checkbox
                value='exponentiated_gradient'
                onChange={handleChangeCheckbox}
                checked={state.exponentiated_gradient !== undefined}
                isInvalid={errors.eg_grid_error}
                isDisabled={
                  errors.error_sensvars === true ||
                  state.mlp__classifier !== undefined ||
                  state.mlp__regressor !== undefined
                }>
                Exponentiated Gradient
              </Checkbox>
              {state.mlp__classifier !== undefined ||
              state.mlp__regressor !== undefined ? (
                <FormHelperText color='darkorange'>
                  Not compatible with MLP Classifier or MLP Regressor
                </FormHelperText>
              ) : (
                ""
              )}
              {errors.eg_grid_error ? (
                <FormErrorMessage>
                  MLP Classifier or MLP Regressor are selected
                </FormErrorMessage>
              ) : (
                ""
              )}
              <Checkbox
                value='grid_search'
                onChange={handleChangeCheckbox}
                checked={state.grid_search !== undefined}
                isInvalid={errors.eg_grid_error}
                isDisabled={
                  errors.error_sensvars === true ||
                  state.mlp__classifier !== undefined ||
                  state.mlp__regressor !== undefined
                }>
                Grid Search
              </Checkbox>
              {state.mlp__classifier !== undefined ||
              state.mlp__regressor !== undefined ? (
                <FormHelperText color='darkorange'>
                  Not compatible with MLP Classifier or MLP Regressor
                </FormHelperText>
              ) : (
                ""
              )}
              {errors.eg_grid_error ? (
                <FormErrorMessage>
                  MLP Classifier or MLP Regressor are selected
                </FormErrorMessage>
              ) : (
                ""
              )}
              {/* <Checkbox
                value='adversarial_debiasing'
                onChange={handleChangeCheckbox}
                isChecked={state.adversarial_debiasing !== undefined}
                isDisabled={
                  errors.error_sensvars === true || state.label === "multiclass"
                }>
                Adversarial Debiasing
              </Checkbox>
              {state.label === "multiclass" ? (
                <FormHelperText color='darkorange'>
                  Not compatible with Multi Class label
                </FormHelperText>
              ) : (
                ""
              )} */}
              <Checkbox
                value='gerry_fair_classifier'
                onChange={handleChangeCheckbox}
                isChecked={state.gerry_fair_classifier !== undefined}
                isDisabled={
                  state.label === "multiclass" || errors.error_sensvars === true
                }>
                GerryFair Classifier
              </Checkbox>
              {state.label === "multiclass" ? (
                <FormHelperText color='darkorange'>
                  Not compatible with Multi Class label
                </FormHelperText>
              ) : (
                ""
              )}
              <Checkbox
                value='meta_fair_classifier'
                onChange={handleChangeCheckbox}
                checked={state.meta_fair_classifier !== undefined}
                isDisabled={
                  state.label === "multiclass" || errors.error_sensvars === true
                }>
                MetaFair Classifier
              </Checkbox>
              {state.label === "multiclass" ? (
                <FormHelperText color='darkorange'>
                  Not compatible with Multi Class label
                </FormHelperText>
              ) : (
                ""
              )}
              {/* <Checkbox
                value='prejudice_remover'
                onChange={handleChangeCheckbox}
                checked={state.prejudice_remover !== undefined}
                isDisabled={
                  state.label === "multiclass" || errors.error_sensvars === true
                }>
                Prejudice Remover
              </Checkbox>
              {state.label === "multiclass" ? (
                <FormHelperText color='darkorange'>
                  Not compatible with Multi Class label
                </FormHelperText>
              ) : (
                ""
              )} */}
            </VStack>
            <FormControl
              isDisabled={
                !state.single_sensitive_var ||
                state.label === "multiclass" ||
                state.svc ||
                state.gradient__descent__classifier ||
                errors.error_sensvars === true
              }
              isInvalid={
                (state.single_sensitive_var || state.multiple_sensitive_vars) &&
                errors.errors_fairmethods
              }>
              <FormLabel size='md' m='10px 0px'>
                Post Processing
                <br />
                These methods work on an already trained ML algorithm to reduce
                the learned bias
              </FormLabel>
              <VStack pl='6' align='flex-start' spacing='10px'>
                <Checkbox
                  value='calibrated_eo'
                  onChange={handleChangeCheckbox}
                  isChecked={state.calibrated_eo !== undefined}>
                  Calibrated EO
                </Checkbox>
                {state.multiple_sensitive_vars ? (
                  <FormHelperText color='darkorange'>
                    Not compatible with multiple sensitive variables
                  </FormHelperText>
                ) : (
                  ""
                )}
                <Checkbox
                  value='reject_option_classifier'
                  onChange={handleChangeCheckbox}
                  isChecked={state.reject_option_classifier !== undefined}>
                  Reject Option Classifier
                </Checkbox>
                {state.multiple_sensitive_vars ? (
                  <FormHelperText color='darkorange'>
                    Not compatible with multiple sensitive variables
                  </FormHelperText>
                ) : (
                  ""
                )}
                {state.label === "multiclass" ? (
                  <FormHelperText color='darkorange'>
                    Not compatible with Multi Class label
                  </FormHelperText>
                ) : (
                  ""
                )}
                {state.svc || state.gradient__descent__classifier ? (
                  <FormHelperText color='darkorange'>
                    Not compatible with Support Vector Classifier and Gradient
                    Descent Classifier
                  </FormHelperText>
                ) : (
                  ""
                )}
              </VStack>
            </FormControl>
          </FormControl>
        </Stack>
      ) : (
        ""
      )}
    </Container>
  );
}

export default Fairness;
