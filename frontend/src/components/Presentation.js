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
import Container from "./Container";

function Presentation({ state, handleChangeCheckbox, errors }) {
  return (
    <Container title='Result presentation'>
      <FormControl isInvalid={errors.pres_error}>
        <VStack align='flex-start' spacing='5'>
          {errors.pres_error ? (
            <Alert status='error'>
              <AlertIcon />
              <AlertDescription>
                Select at least one presentation method (this field is valid
                only for the code generation)
              </AlertDescription>
            </Alert>
          ) : (
            ""
          )}
          <Checkbox
            value='tabular'
            onChange={handleChangeCheckbox}
            isChecked={state.tabular}>
            Tabular (CSV file)
          </Checkbox>
          <FormLabel>Charts</FormLabel>
          <Stack pl='6'>
            <Checkbox
              value='bar_plot'
              onChange={handleChangeCheckbox}
              isChecked={state.bar_plot}>
              BarPlot
            </Checkbox>
            <Checkbox
              value='line_plot'
              onChange={handleChangeCheckbox}
              isChecked={state.line_plot}>
              LinePlot
            </Checkbox>
            <Checkbox
              value='strip_plot'
              onChange={handleChangeCheckbox}
              isChecked={state.strip_plot}>
              StripPlot
            </Checkbox>
            <Checkbox
              value='box_plot'
              onChange={handleChangeCheckbox}
              isChecked={state.box_plot}>
              BoxPlot
            </Checkbox>
            <Checkbox
              value='point_plot'
              onChange={handleChangeCheckbox}
              isChecked={state.point_plot}>
              PointPlot
            </Checkbox>
          </Stack>
        </VStack>
      </FormControl>
    </Container>
  );
}

export default Presentation;
