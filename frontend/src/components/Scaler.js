import { Checkbox, FormControl, Stack } from "@chakra-ui/react";
import React from "react";
import Container from "./Container";

function Scaler({
  state,
  setState,
  handleChangeCheckbox,
  handleChangeRadio,
  handleChangeText,
}) {
  return (
    <Container title='Scaler'>
      <FormControl>
        <Checkbox
          value='standard_scaler'
          onChange={handleChangeCheckbox}
          isDisabled={
            state.min_max_scaler ||
            state.max_abs_scaler ||
            state.robust_scaler ||
            state.quantile_transformer_scaler ||
            state.power_transformer_scaler
          }>
          Standard Scaler
        </Checkbox>
      </FormControl>
      <FormControl>
        <Checkbox
          value='min_max_scaler'
          onChange={handleChangeCheckbox}
          isDisabled={
            state.standard_scaler ||
            state.max_abs_scaler ||
            state.robust_scaler ||
            state.quantile_transformer_scaler ||
            state.power_transformer_scaler
          }>
          Min Max Scaler
        </Checkbox>
      </FormControl>

      <FormControl>
        <Checkbox
          value='max_abs_scaler'
          onChange={handleChangeCheckbox}
          isDisabled={
            state.standard_scaler ||
            state.min_max_scaler ||
            state.robust_scaler ||
            state.quantile_transformer_scaler ||
            state.power_transformer_scaler
          }>
          Max Abs Scaler
        </Checkbox>
      </FormControl>
      <Checkbox
        value='robust_scaler'
        onChange={handleChangeCheckbox}
        isDisabled={
          state.standard_scaler ||
          state.min_max_scaler ||
          state.max_abs_scaler ||
          state.quantile_transformer_scaler ||
          state.power_transformer_scaler
        }>
        Robust Scaler
      </Checkbox>
      <Checkbox
        value='quantile_transformer_scaler'
        onChange={handleChangeCheckbox}
        isDisabled={
          state.standard_scaler ||
          state.min_max_scaler ||
          state.max_abs_scaler ||
          state.robust_scaler ||
          state.power_transformer_scaler
        }>
        Quantile Transformer Scaler
      </Checkbox>

      <FormControl>
        <Checkbox
          value='power_transformer_scaler'
          onChange={handleChangeCheckbox}
          isDisabled={
            state.standard_scaler ||
            state.min_max_scaler ||
            state.max_abs_scaler ||
            state.robust_scaler ||
            state.quantile_transformer_scaler
          }>
          Power Transformer Scaler
        </Checkbox>
        <Stack pl={6} mt={1} spacing={1}>
          <Checkbox
            value='yeo_johnson_method'
            onChange={handleChangeCheckbox}
            isDisabled={
              !state.quantile_transformer_scaler || state.box_cox_method
            }>
            Yeo Johnson Method
          </Checkbox>
          <Checkbox
            value='box_cox_method'
            onChange={handleChangeCheckbox}
            isDisabled={
              !state.quantile_transformer_scaler || state.yeo_johnson_method
            }>
            Box Cox Method
          </Checkbox>
        </Stack>
      </FormControl>
    </Container>
  );
}

export default Scaler;
