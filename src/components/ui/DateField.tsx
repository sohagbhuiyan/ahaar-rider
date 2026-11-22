import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface Props {
  label?: string;
  /** Date as `YYYY-MM-DD`, or '' when unset. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  editable?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  containerClassName?: string;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromYmd(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A tappable field that opens the native date picker; stores the value as `YYYY-MM-DD`. */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Select a date',
  hint,
  error,
  editable = true,
  minimumDate,
  maximumDate,
  containerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = fromYmd(value);
  const pickerValue = selected ?? minimumDate ?? new Date();
  const display = selected
    ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).format(selected)
    : null;

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label ? <Text className="text-sm font-semibold text-text-primary">{label}</Text> : null}

      <Pressable
        onPress={editable ? () => setOpen((o) => !o) : undefined}
        disabled={!editable}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}${display ? `, ${display}` : ''}` : display ?? placeholder}
        accessibilityState={{ disabled: !editable, expanded: open }}
        className={cn(
          'flex-row items-center justify-between rounded-2xl border bg-surface px-4 py-3.5',
          error ? 'border-danger' : open ? 'border-brand-500' : 'border-border',
          !editable && 'bg-surface-muted opacity-70',
        )}
      >
        <Text className={cn('text-base', display ? 'text-text-primary' : 'text-text-muted')}>
          {display ?? placeholder}
        </Text>
        <Text className="text-base">📅</Text>
      </Pressable>

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          presentation="dialog"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          accentColor={colors.brand[500]}
          onValueChange={(_e, date) => {
            setOpen(false);
            onChange(toYmd(date));
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}

      {open && Platform.OS === 'ios' ? (
        <View className="rounded-2xl border border-border bg-surface p-2">
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="inline"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            accentColor={colors.brand[500]}
            onValueChange={(_e, date) => onChange(toYmd(date))}
            style={{ height: 340 }}
          />
          <Pressable
            onPress={() => {
              if (!selected) onChange(toYmd(pickerValue));
              setOpen(false);
            }}
            accessibilityRole="button"
            className="self-end rounded-full bg-brand-500 px-4 py-2 mt-1"
          >
            <Text className="text-sm font-bold text-text-primary">Done</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <Text className="text-xs text-danger">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}
