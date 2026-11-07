import { forwardRef, useState } from 'react';
import { Pressable, type TextInput } from 'react-native';

import EyeIcon from '@/components/icons/EyeIcon';
import { colors } from '@/lib/theme';

import { Input } from './Input';

type Props = Omit<React.ComponentProps<typeof Input>, 'secureTextEntry' | 'right'>;

export const PasswordInput = forwardRef<TextInput, Props>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      ref={ref}
      {...props}
      secureTextEntry={!visible}
      autoCorrect={false}
      autoCapitalize="none"
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          className="-mr-1 h-9 w-9 items-center justify-center rounded-full active:bg-surface-muted"
        >
          <EyeIcon color={visible ? colors.brand[500] : colors.text.muted} off={visible} />
        </Pressable>
      }
    />
  );
});
