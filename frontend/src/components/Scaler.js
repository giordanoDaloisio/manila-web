import { Checkbox, FormControl, FormHelperText, Stack } from "@chakra-ui/react";
import React from "react";
import Container from "./Container";

function Scaler({
  state,
  setState,
  handleChangeCheckbox,
  handleChangeRadio,
  handleChangeText,
  errors,
}) {
  return (
    <Container title='Scaler'>
      <FormControl>
        <Checkbox
          value='standard_scaler'
          onChange={handleChangeCheckbox}
          isChecked={state.standard_scaler !== undefined}
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
          isChecked={state.min_max_scaler !== undefined}
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
          isChecked={state.max_abs_scaler !== undefined}
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
        isChecked={state.robust_scaler !== undefined}
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
        isChecked={state.quantile_transformer_scaler !== undefined}
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
          isChecked={state.power_transformer_scaler !== undefined}
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
            isChecked={state.yeo_johnson_method !== undefined}
            isDisabled={
              !state.power_transformer_scaler || state.box_cox_method
            }>
            Yeo Johnson Method
          </Checkbox>
          <Checkbox
            value='box_cox_method'
            onChange={handleChangeCheckbox}
            isChecked={state.box_cox_method !== undefined}
            isDisabled={
              !state.power_transformer_scaler ||
              state.yeo_johnson_method ||
              !state.strictly_positive_attributes
            }>
            Box Cox Method
          </Checkbox>
          {errors.box_cox_err || !state.strictly_positive_attributes ? (
            <FormHelperText>
              Box Cox requires dataset with strictly positive attributes
            </FormHelperText>
          ) : (
            ""
          )}
        </Stack>
      </FormControl>
    </Container>
  );
}

export default Scaler;
