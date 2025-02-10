import {
  Alert,
  AlertIcon,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Radio,
  RadioGroup,
  Stack,
  VStack,
} from "@chakra-ui/react";
import React from "react";
import Container from "./Container";

function Validation({ state, handleChangeRadio, setState }) {
  return (
    <Container title='Validation'>
      {/* <Alert status='warning'>
        <AlertIcon />
        If you select cross-validation, you can not run the experiment on the
        server.
      </Alert> */}
      <FormControl>
        <Checkbox
          name='use_validation'
          onChange={(e) =>
            setState({ ...state, use_validation: e.target.checked })
          }>
          Use validation
        </Checkbox>
      </FormControl>
      <Stack pl='6'>
        <RadioGroup
          name='validation'
          defaultChecked={state.validation}
          isDisabled={!state.use_validation}>
          <VStack align='flex-start' spacing='10px'>
            <Radio value='k_fold' onChange={handleChangeRadio}>
              KFold
            </Radio>
            <Radio value='leave_one_out' onChange={handleChangeRadio}>
              Leave One Out
            </Radio>
            <Radio value='leave_p_out' onChange={handleChangeRadio}>
              Leave P Out
            </Radio>
            <Radio value='stratified_k_fold' onChange={handleChangeRadio}>
              Stratified KFold
            </Radio>
            <Radio value='group_k_fold' onChange={handleChangeRadio}>
              Group KFold
            </Radio>
          </VStack>
        </RadioGroup>
        <FormControl isDisabled={!state.use_validation}>
          <HStack spacing='5px'>
            <FormLabel>Number of folds: </FormLabel>
            <NumberInput
              name='k'
              value={state.K}
              onChange={(val) => setState({ ...state, k: val })}>
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </HStack>
        </FormControl>
      </Stack>
      <Checkbox
        onChange={(e) =>
          setState(
            e.target.checked
              ? { ...state, save_temporary_results: true }
              : { ...state, save_temporary_results: false }
          )
        }
        isChecked={state.save_temporary_results === true}>
        Save results for each fold (works only in the generated code)
      </Checkbox>
    </Container>
  );
}

export default Validation;
