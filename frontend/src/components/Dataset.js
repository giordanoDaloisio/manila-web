import {
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
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
import Container from "./Container";

function Dataset({
  state,
  setState,
  handleChangeCheckbox,
  handleChangeRadio,
  handleChangeText,
  errors,
}) {
  return (
    <Container title='Dataset'>
      <FormControl as='fieldset'>
        <FormLabel as='legend'>File Extension</FormLabel>
        <RadioGroup defaultValue={state.extension} name='extension'>
          <Stack spacing='34px' direction={{ base: "column", lg: "row" }}>
            <Radio value='csv' onChange={(e) => handleChangeRadio(e)}>
              CSV
            </Radio>
            <Radio value='parquet' onChange={(e) => handleChangeRadio(e)}>
              Parquet
            </Radio>
            <Radio value='excel' onChange={(e) => handleChangeRadio(e)}>
              Excel
            </Radio>
            <Radio value='json' onChange={(e) => handleChangeRadio(e)}>
              JSON
            </Radio>
            <Radio value='text' onChange={(e) => handleChangeRadio(e)}>
              Text
            </Radio>
            <Radio value='html' onChange={(e) => handleChangeRadio(e)}>
              HTML
            </Radio>
            <Radio value='xml' onChange={(e) => handleChangeRadio(e)}>
              XML
            </Radio>
            <Radio value='hdf5' onChange={(e) => handleChangeRadio(e)}>
              HDF5
            </Radio>
          </Stack>
        </RadioGroup>
      </FormControl>
      <FormControl>
        <FormLabel>Label</FormLabel>
        <RadioGroup defaultValue={state.label} name='label'>
          <Stack spacing='24px' direction={{ base: "column", lg: "row" }}>
            <Radio value='binary' onChange={handleChangeRadio}>
              Binary
            </Radio>
            <Radio
              value='multiclass'
              onChange={handleChangeRadio}
              isDisabled={
                state.reweighing ||
                state.dir ||
                state.adversarial_debiasing ||
                state.gerry_fair_classifier ||
                state.meta_fair_classifier ||
                state.prejudice_remover ||
                state.calibrated_eo ||
                state.reject_option_classifier ||
                state.auc
              }>
              MultiClass
            </Radio>
            {state.reweighing ||
            state.dir ||
            state.adversarial_debiasing ||
            state.gerry_fair_classifier ||
            state.meta_fair_classifier ||
            state.prejudice_remover ||
            state.calibrated_eo ||
            state.reject_option_classifier ||
            state.auc ? (
              <FormHelperText color='darkorange'>
                Not compatible with Reweighing, DIR, Adversarial Debiasing,
                Gerry Fair, Meta Fair, Prejudice Remover, Calibrated EO, Reject
                Option Classifier and with AUC metric
              </FormHelperText>
            ) : (
              ""
            )}
          </Stack>
        </RadioGroup>
        <Stack m='1' spacing='1' direction={{ base: "column", lg: "row" }}>
          <FormControl isRequired>
            <FormLabel>Label Name</FormLabel>
            <Input name='name' onChange={handleChangeText} value={state.name} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Positive Value</FormLabel>
            <Input
              name='positive_value'
              onChange={handleChangeText}
              value={state.positive_value}
            />
          </FormControl>
        </Stack>
      </FormControl>
      <FormControl isRequired={state.fairness !== undefined}>
        <FormLabel>Sensitive Variables</FormLabel>
        <VStack align='flex-start'>
          <Checkbox
            value='single_sensitive_var'
            disabled={state.multiple_sensitive_vars}
            onChange={handleChangeCheckbox}>
            Single Sensitive Variable
          </Checkbox>
          <FormControl isDisabled={!state.single_sensitive_var} isRequired>
            <Stack spacing='5px' direction={{ base: "column", lg: "row" }}>
              <VStack align='flex-start'>
                <FormLabel>Variable Name</FormLabel>
                <Input
                  value={state.variable_name ? state.variable_name : ""}
                  name='variable_name'
                  onChange={handleChangeText}
                  required
                />
              </VStack>
              <VStack align='flex-start'>
                <FormLabel>Unprivileged value</FormLabel>
                <Input
                  value={
                    state.unprivileged_value ? state.unprivileged_value : ""
                  }
                  name='unprivileged_value'
                  onChange={handleChangeText}
                  required
                />
              </VStack>
              <VStack align='flex-start'>
                <FormLabel>Privileged value</FormLabel>
                <Input
                  value={state.privileged_value ? state.privileged_value : ""}
                  name='privileged_value'
                  onChange={handleChangeText}
                  required
                />
              </VStack>
            </Stack>
          </FormControl>
          <Checkbox
            value='multiple_sensitive_vars'
            disabled={
              state.single_sensitive_var ||
              state.dir ||
              state.calibrated_eo ||
              state.reject_option_classifier
            }
            onChange={handleChangeCheckbox}>
            Multiple Sensitive Variables
          </Checkbox>
          {state.dir ||
          state.calibrated_eo ||
          state.reject_option_classifier ? (
            <FormHelperText color='darkorange'>
              Not compatible with DIR, CalibratedEO and Reject Option Classifier
            </FormHelperText>
          ) : (
            ""
          )}
          <FormControl isDisabled={!state.multiple_sensitive_vars} isRequired>
            <Stack
              spacing='5px'
              w='full'
              h='full'
              direction={{ base: "column", lg: "row" }}>
              <VStack align='flex-start' w='full' h='full'>
                <FormLabel>Variable Names</FormLabel>
                <Input
                  value={state.variable_names ? state.variable_names : ""}
                  name='variable_names'
                  onChange={handleChangeText}
                  required
                  placeholder='Comma separated list of values'
                />
              </VStack>
              <VStack align='flex-start' w='full' h='full'>
                <FormLabel>Unprivileged values</FormLabel>
                <Input
                  value={
                    state.unprivileged_values ? state.unprivileged_values : ""
                  }
                  name='unprivileged_values'
                  onChange={handleChangeText}
                  required
                  placeholder='Comma separated list of values'
                />
              </VStack>
              <VStack align='flex-start' w='full' h='full'>
                <FormLabel>Privileged values</FormLabel>
                <Input
                  value={state.privileged_values ? state.privileged_values : ""}
                  name='privileged_values'
                  onChange={handleChangeText}
                  required
                  placeholder='Comma separated list of values'
                />
              </VStack>
            </Stack>
          </FormControl>
        </VStack>
      </FormControl>
      <FormControl>
        <Checkbox value='has_index' onChange={handleChangeCheckbox}>
          Dataset has an index column
        </Checkbox>
      </FormControl>
      <FormControl pl='6' isDisabled={state.has_index === undefined}>
        <FormLabel>Index Column</FormLabel>
        <NumberInput
          name='index_col'
          value={state.index_col}
          onChange={(val) => setState({ ...state, index_col: val })}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        <FormHelperText>
          Specify the position of the column having index values
        </FormHelperText>
      </FormControl>
      <FormControl>
        <Checkbox
          value={state.has_header}
          onChange={handleChangeCheckbox}
          isChecked={state.has_header}>
          Header
        </Checkbox>
        <FormHelperText>Check if the dataset has a header</FormHelperText>
      </FormControl>
      <Checkbox
        value='strictly_positive_attributes'
        onChange={handleChangeCheckbox}
        checked={state.strictly_positive_attributes}>
        Dataset has strictly positive attributes
      </Checkbox>
    </Container>
  );
}

export default Dataset;
