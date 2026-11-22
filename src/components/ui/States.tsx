import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface EmptyProps {
  title: string;
  icon?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ title, icon = '📦', description, actionLabel, onAction, className }: EmptyProps) {
  return (
    <View className={cn('items-center justify-center p-8', className)}>
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-surface-muted border border-border">
        <Text className="text-2xl">{icon}</Text>
      </View>
      <Text className="text-center text-lg font-bold text-text-primary">{title}</Text>
      {description ? (
        <Text className="mt-1 text-center text-sm text-text-secondary">{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="sm" className="mt-5" />
      ) : null}
    </View>
  );
}

interface ErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  className,
}: ErrorProps) {
  return (
    <View className={cn('items-center justify-center p-8', className)}>
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-danger-soft border border-danger/20">
        <Text className="text-2xl">⚠️</Text>
      </View>
      <Text className="text-center text-lg font-bold text-text-primary">{title}</Text>
      <Text className="mt-1 text-center text-sm text-danger">{message}</Text>
      {onRetry ? (
        <Button label="Try again" variant="outline" onPress={onRetry} size="sm" className="mt-5" />
      ) : null}
    </View>
  );
}

export function LoadingSpinner({ label, className }: { label?: string; className?: string }) {
  return (
    <View className={cn('items-center justify-center p-8 gap-3', className)}>
      <ActivityIndicator size="large" color={colors.brand[500]} />
      {label ? <Text className="text-sm font-medium text-text-secondary">{label}</Text> : null}
    </View>
  );
}
