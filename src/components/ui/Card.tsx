import { Pressable, View, type ViewProps } from 'react-native';

import { cn } from '@/lib/utils';

interface CardProps extends ViewProps {
  onPress?: () => void;
  className?: string;
}

export function Card({ onPress, className, children, ...rest }: CardProps) {
  const classes = cn(
    'rounded-2xl bg-surface border border-border p-4 shadow-sm',
    className,
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className={cn(classes, 'active:opacity-90')}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={classes} {...rest}>
      {children}
    </View>
  );
}
