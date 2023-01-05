import {
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
  VStack,
} from "@chakra-ui/react";
import React from "react";
import Container from "./Container";

function Validation({ state, handleChangeRadio, setState }) {
  return (
    <Container title='Validation'>
      <RadioGroup name='validation' defaultChecked={state.validation}>
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
      <FormControl>
        <HStack spacing='5px'>
          <FormLabel>Number of folds: </FormLabel>
          <NumberInput
            name='k'
            value={state.k}
            onChange={(val) => setState({ ...state, k: val })}>
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </HStack>
      </FormControl>
    </Container>
  );
}

export default Validation;
