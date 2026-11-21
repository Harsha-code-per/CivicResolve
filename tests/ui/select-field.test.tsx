import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectField, toOptions } from '../../src/ui/SelectField.js';

type Size = 'small' | 'large';
const OPTIONS = toOptions<Size>(['small', 'large'], (size) => size.toUpperCase());

function renderField(onChange: (value: Size) => void): HTMLSelectElement {
  render(
    <SelectField id="size" label="Size" value="small" options={OPTIONS} onChange={onChange} />,
  );
  return screen.getByLabelText<HTMLSelectElement>('Size');
}

describe('SelectField', () => {
  it('labels the select and reports the picked option with its type', async () => {
    const onChange = vi.fn();
    const select = renderField(onChange);
    expect(screen.getByRole('option', { name: 'LARGE' })).toBeInTheDocument();
    await userEvent.selectOptions(select, 'large');
    expect(onChange).toHaveBeenCalledWith('large');
  });

  it('ignores a value that is not one of its options', () => {
    const onChange = vi.fn();
    const select = renderField(onChange);
    fireEvent.change(select, { target: { value: 'medium' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
