import type { ReactNode } from 'react';

export const inputClass = (invalid?: boolean) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-2 focus:outline-offset-0 focus:outline-indigo-600 ${
    invalid ? 'border-red-400' : 'border-gray-300'
  }`;

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  helperText?: string;
  children: ReactNode;
}

/** Label + control + error/helper text, shared by every form field. */
export function Field({ label, htmlFor, error, helperText, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-gray-900">
        {label} <span className="text-red-600">*</span>
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : (
        helperText && <p className="text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
