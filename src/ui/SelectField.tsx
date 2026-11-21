import type { ReactElement } from 'react';

export interface SelectOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

export interface SelectFieldProps<T extends string> {
  readonly id: string;
  readonly label: string;
  readonly value: T;
  readonly options: readonly SelectOption<T>[];
  readonly onChange: (value: T) => void;
}

/**
 * A labelled native select whose value is narrowed back to its option type, so
 * callers never cast `event.target.value`.
 *
 * @param props - Id, visible label, current value, options and change callback.
 * @returns Field wrapper with label and select.
 */
export function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>): ReactElement {
  const handleChange = (raw: string): void => {
    const picked = options.find((option) => option.value === raw);
    if (picked) onChange(picked.value);
  };
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          handleChange(event.target.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Builds select options from a list of values and a label lookup.
 *
 * @param values - Allowed values, in display order.
 * @param labelOf - Maps a value to its visible label.
 * @returns Options for SelectField.
 */
export function toOptions<T extends string>(
  values: readonly T[],
  labelOf: (value: T) => string,
): SelectOption<T>[] {
  return values.map((value) => ({ value, label: labelOf(value) }));
}
