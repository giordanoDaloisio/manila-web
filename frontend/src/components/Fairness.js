import {
  Alert,
  AlertDescription,
  AlertIcon,
  Checkbox,
  FormControl,
  FormLabel,
  Stack,
  VStack,
} from "@chakra-ui/react";
import { useOr } from "../hook/useOr";
import Container from "./Container";

function Fairness({ state, setState, handleChangeCheckbox, setError }) {
  const [count, handleOr] = useOr(handleChangeCheckbox, setError);
  return (
    <Container title='Quality Methods'>
      <Checkbox value='fairness' onChange={handleChangeCheckbox}>
        Fairness
      </Checkbox>
      {state.fairness ? (
        <Stack pl='6'>
          <FormControl
            isDisabled={
              !state.single_sensitive_var && !state.multiple_sensitive_vars
            }
            isInvalid={
              (state.single_sensitive_var || state.multiple_sensitive_vars) &&
              count === 0
            }>
            {(state.single_sensitive_var || state.multiple_sensitive_vars) &&
            count === 0 ? (
              <Alert status='error'>
                <AlertIcon />
                <AlertDescription>
                  Select at least one fairness method
                </AlertDescription>
              </Alert>
            ) : (
              ""
            )}
            {!state.single_sensitive_var && !state.multiple_sensitive_vars ? (
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
              onChange={handleOr}>
              No Method
            </Checkbox>
            <FormLabel size='md' m='10px 0px'>
              Pre Processing
            </FormLabel>
            <VStack pl='6' align='flex-start' spacing='10px'>
              <Checkbox
                value='reweighing'
                onChange={handleOr}
                checked={state.reweighing !== undefined}>
                Reweighing
              </Checkbox>
              <Checkbox
                value='dir'
                onChange={handleOr}
                checked={state.dir !== undefined}>
                DIR
              </Checkbox>
              <Checkbox
                value='demv'
                onChange={handleOr}
                checked={state.demv !== undefined}>
                DEMV
              </Checkbox>
            </VStack>
            <FormLabel size='md' m='10px 0px'>
              In Processing
            </FormLabel>
            <VStack pl='6' align='flex-start' spacing='10px'>
              <Checkbox
                value='exponentiated_gradient'
                onChange={handleOr}
                checked={state.exponentiated_gradient !== undefined}>
                Exponentiated Gradient
              </Checkbox>
              <Checkbox
                value='grid_search'
                onChange={handleOr}
                checked={state.grid_search !== undefined}>
                Grid Search
              </Checkbox>
              <Checkbox
                value='adversarial_debiasing'
                onChange={handleOr}
                checked={state.adversarial_debiasing !== undefined}>
                Adversarial Debiasing
              </Checkbox>
              <Checkbox
                value='adversarial_debiasing'
                onChange={handleOr}
                checked={state.adversarial_debiasing !== undefined}>
                Adversarial Debiasing
              </Checkbox>
              <Checkbox
                value='gerry_fair_classifier'
                onChange={handleOr}
                isChecked={state.gerry_fair_classifier !== undefined}>
                GerryFair Classifier
              </Checkbox>
              <Checkbox
                value='meta_fair_classifier'
                onChange={handleOr}
                checked={state.meta_fair_classifier !== undefined}>
                MetaFair Classifier
              </Checkbox>
              <Checkbox
                value='prejudice_remover'
                onChange={handleOr}
                checked={state.prejudice_remover !== undefined}>
                Prejudice Remover
              </Checkbox>
            </VStack>
            <FormLabel size='md' m='10px 0px'>
              Post Processing
            </FormLabel>
            <VStack pl='6' align='flex-start' spacing='10px'>
              <Checkbox
                value='calibrated_eo'
                onChange={handleOr}
                isChecked={state.calibrated_eo !== undefined}>
                Calibrated EO
              </Checkbox>
              <Checkbox
                value='reject_option_classifier'
                onChange={handleOr}
                isChecked={state.reject_option_classifier !== undefined}>
                Reject Option Classifier
              </Checkbox>
            </VStack>
          </FormControl>
        </Stack>
      ) : (
        ""
      )}
    </Container>
  );
}

export default Fairness;
