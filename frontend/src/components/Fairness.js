import {
  Checkbox,
  FormControl,
  FormErrorMessage,
  Heading,
  Stack,
  VStack,
} from "@chakra-ui/react";
import Container from "./Container";

function Fairness({ state, setState, handleChangeCheckbox }) {
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
              !state.single_sensitive_var && !state.multiple_sensitive_vars
            }>
            {!state.single_sensitive_var && !state.multiple_sensitive_vars ? (
              <FormErrorMessage>
                Select the sensitive variables
              </FormErrorMessage>
            ) : (
              ""
            )}
            <Checkbox
              value='no__method'
              isChecked={state.no__method !== undefined}
              onChange={handleChangeCheckbox}>
              No Method
            </Checkbox>
            <Heading size='md' m='10px 0px'>
              Pre Processing
            </Heading>
            <VStack pl='6' align='flex-start' spacing='10px'>
              <Checkbox
                value='reweighing'
                onChange={handleChangeCheckbox}
                checked={state.reweighing !== undefined}>
                Reweighing
              </Checkbox>
              <Checkbox
                value='dir'
                onChange={handleChangeCheckbox}
                checked={state.dir !== undefined}>
                DIR
              </Checkbox>
              <Checkbox
                value='demv'
                onChange={handleChangeCheckbox}
                checked={state.demv !== undefined}>
                DEMV
              </Checkbox>
            </VStack>
            <Heading size='md' m='10px 0px'>
              In Processing
            </Heading>
            <VStack pl='6' align='flex-start' spacing='10px'>
              <Checkbox
                value='exponentiated_gradient'
                onChange={handleChangeCheckbox}
                checked={state.exponentiated_gradient !== undefined}>
                Exponentiated Gradient
              </Checkbox>
              <Checkbox
                value='grid_search'
                onChange={handleChangeCheckbox}
                checked={state.grid_search !== undefined}>
                Grid Search
              </Checkbox>
              <Checkbox
                value='adversarial_debiasing'
                onChange={handleChangeCheckbox}
                checked={state.adversarial_debiasing !== undefined}>
                Adversarial Debiasing
              </Checkbox>
              <Checkbox
                value='adversarial_debiasing'
                onChange={handleChangeCheckbox}
                checked={state.adversarial_debiasing !== undefined}>
                Adversarial Debiasing
              </Checkbox>
              <Checkbox
                value='gerry_fair_classifier'
                onChange={handleChangeCheckbox}
                isChecked={state.gerry_fair_classifier !== undefined}>
                GerryFair Classifier
              </Checkbox>
              <Checkbox
                value='meta_fair_classifier'
                onChange={handleChangeCheckbox}
                checked={state.meta_fair_classifier !== undefined}>
                MetaFair Classifier
              </Checkbox>
              <Checkbox
                value='prejudice_remover'
                onChange={handleChangeCheckbox}
                checked={state.prejudice_remover !== undefined}>
                Prejudice Remover
              </Checkbox>
            </VStack>
            <Heading size='md' m='10px 0px'>
              Post Processing
            </Heading>
            <VStack pl='6' align='flex-start' spacing='10px'>
              <Checkbox
                value='calibrated_eo'
                onChange={handleChangeCheckbox}
                isChecked={state.calibrated_eo !== undefined}>
                Calibrated EO
              </Checkbox>
              <Checkbox
                value='reject_option_classifier'
                onChange={handleChangeCheckbox}
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
