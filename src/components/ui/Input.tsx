import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { cssInterop } from 'nativewind';
import { forwardRef, useRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

import { useSheet } from './sheetContext';

cssInterop(BottomSheetTextInput, { className: 'style' });

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  containerClassName?: string;
  className?: string;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  {
    label,
    error,
    hint,
    left,
    right,
    containerClassName,
    className,
    editable = true,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const hasError = Boolean(error);
  const sheet = useSheet();
  const containerRef = useRef<View>(null);
  const Field = (sheet ? BottomSheetTextInput : TextInput) as typeof TextInput;

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (event) => {
    if (sheet && containerRef.current) sheet.onFieldFocus(containerRef.current);
    onFocus?.(event);
  };
  const handleBlur: NonNullable<TextInputProps['onBlur']> = (event) => {
    if (sheet && containerRef.current) sheet.onFieldBlur(containerRef.current);
    onBlur?.(event);
  };

  return (
    <View ref={containerRef} className={cn('gap-1.5', containerClassName)}>
      {label ? (
        <Text className="text-sm font-semibold text-text-primary">{label}</Text>
      ) : null}

      <View
        className={cn(
          'flex-row items-center gap-2 rounded-2xl border bg-surface px-4',
          hasError ? 'border-danger' : 'border-border',
          !editable && 'bg-surface-muted opacity-70',
        )}
      >
        {left}

        <Field
          ref={ref}
          editable={editable}
          placeholderTextColor={colors.text.muted}
          accessibilityLabel={label}
          accessibilityState={{ disabled: !editable }}
          className={cn(
            'flex-1 py-3.5 text-base text-text-primary',
            className,
          )}
          {...rest}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {right}
      </View>

      {error ? (
        <Text className="text-xs font-medium text-danger">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-text-muted">{hint}</Text>
      ) : null}
    </View>
  );
});
