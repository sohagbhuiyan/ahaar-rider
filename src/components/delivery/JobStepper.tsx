import { Text, View } from 'react-native';

import type { DeliveryStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const STEPS = ['Heading to kitchen', 'Picked up', 'On the way', 'Delivered'];

/** Index of the step in progress; STEPS.length when everything is done. */
function currentIndex(status: DeliveryStatus): number {
  switch (status) {
    case 'picked_up':
      return 1;
    case 'on_the_way':
      return 2;
    case 'delivered':
      return STEPS.length;
    default:
      return 0;
  }
}

export function JobStepper({ status }: { status: DeliveryStatus }) {
  const current = currentIndex(status);
  const failed = status === 'failed' || status === 'cancelled';

  return (
    <View className="flex-row items-start">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current && !failed;
        return (
          <View key={label} className="flex-1 items-center">
            <View className="w-full flex-row items-center">
              <View className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : i <= current ? 'bg-brand-500' : 'bg-border')} />
              <View
                className={cn(
                  'h-7 w-7 items-center justify-center rounded-full border-2',
                  done && 'bg-brand-700 border-brand-700',
                  active && 'bg-brand-50 border-brand-500',
                  !done && !active && (failed && i === current ? 'bg-danger-soft border-danger' : 'bg-surface border-border'),
                )}
              >
                <Text
                  className={cn(
                    'text-[11px] font-black',
                    done ? 'text-white' : active ? 'text-brand-700' : 'text-text-muted',
                  )}
                >
                  {done ? '✓' : i + 1}
                </Text>
              </View>
              <View
                className={cn('h-0.5 flex-1', i === STEPS.length - 1 ? 'bg-transparent' : i < current ? 'bg-brand-500' : 'bg-border')}
              />
            </View>
            <Text
              className={cn(
                'mt-1.5 text-center text-[10px] font-bold',
                done || active ? 'text-text-primary' : 'text-text-muted',
              )}
              numberOfLines={2}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
