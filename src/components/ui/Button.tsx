import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'danger'
  | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  isLoading?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  textClassName?: string;
}

const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 active:bg-brand-600',
  secondary: 'bg-brand-50 active:bg-brand-100 border border-brand-200',
  outline: 'bg-transparent border border-border active:bg-surface-secondary',
  ghost: 'bg-transparent active:bg-surface-secondary',
  destructive: 'bg-danger active:opacity-90',
  danger: 'bg-danger active:opacity-90',
  success: 'bg-success active:opacity-90',
};

const LABEL: Record<ButtonVariant, string> = {
  primary: 'text-text-primary font-black',
  secondary: 'text-brand-700 font-bold',
  outline: 'text-text-primary font-bold',
  ghost: 'text-brand-700 font-bold',
  destructive: 'text-text-inverse font-bold',
  danger: 'text-text-inverse font-bold',
  success: 'text-text-inverse font-bold',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 rounded-xl',
  md: 'h-12 px-5 rounded-2xl',
  lg: 'h-14 px-6 rounded-2xl',
};

const LABEL_SIZE: Record<ButtonSize, string> = {
  sm: 'text-sm font-semibold',
  md: 'text-sm font-bold',
  lg: 'text-base font-bold',
};

const SPINNER: Record<ButtonVariant, string> = {
  primary: colors.text.primary,
  secondary: colors.brand[700],
  outline: colors.brand[500],
  ghost: colors.brand[500],
  destructive: colors.text.inverse,
  danger: colors.text.inverse,
  success: colors.text.inverse,
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  isLoading = false,
  left,
  right,
  fullWidth = true,
  disabled,
  className,
  textClassName,
  ...rest
}: Props) {
  const isButtonLoading = loading || isLoading;
  const isDisabled = disabled || isButtonLoading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isButtonLoading }}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center gap-2',
        SIZE[size],
        CONTAINER[variant],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
      {...rest}
    >
      {isButtonLoading ? (
        <ActivityIndicator size="small" color={SPINNER[variant]} />
      ) : (
        left
      )}

      <Text
        className={cn(
          LABEL_SIZE[size],
          LABEL[variant],
          textClassName,
        )}
      >
        {label}
      </Text>

      {!loading && right}
    </Pressable>
  );
}
