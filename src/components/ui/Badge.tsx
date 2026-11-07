import { Text, View } from 'react-native';

import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'brand'
  | 'muted'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline';

interface Props {
  label: string;
  variant?: BadgeVariant;
  className?: string;
  textClassName?: string;
}

const CONTAINER: Record<BadgeVariant, string> = {
  brand: 'bg-brand-50 border border-brand-200',
  muted: 'bg-surface-muted border border-border',
  success: 'bg-success-soft border border-success/20',
  warning: 'bg-warning-soft border border-warning/20',
  danger: 'bg-danger-soft border border-danger/20',
  info: 'bg-info-soft border border-info/20',
  outline: 'bg-transparent border border-border',
};

const LABEL: Record<BadgeVariant, string> = {
  brand: 'text-brand-700',
  muted: 'text-text-secondary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  outline: 'text-text-secondary',
};

export function Badge({ label, variant = 'muted', className, textClassName }: Props) {
  return (
    <View
      className={cn(
        'self-start rounded-full px-2.5 py-1',
        CONTAINER[variant],
        className,
      )}
    >
      <Text className={cn('text-xs font-bold tracking-wide', LABEL[variant], textClassName)}>
        {label}
      </Text>
    </View>
  );
}
