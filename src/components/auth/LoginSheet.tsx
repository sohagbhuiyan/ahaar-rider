import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View, type TextInput } from 'react-native';
import { toast } from 'sonner-native';
import { z } from 'zod';

import { Button, Input, PasswordInput, Sheet } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api/client';
import { routeForStatus } from '@/lib/onboarding';
import { useLogin } from '@/lib/api/hooks/useRiderAuth';

const schema = z.object({
  login: z.string().min(1, 'Email or phone number is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
}

export function LoginSheet({ open, onClose, onOpenRegister }: Props) {
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loginMutation = useLogin();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { login: '', password: '' },
  });

  const handleClose = () => {
    reset();
    setErrorMsg(null);
    onClose();
  };

  const onSubmit = (values: FormValues) => {
    setErrorMsg(null);
    loginMutation.mutate(values, {
      onSuccess: (data) => {
        toast.success(`Welcome back, ${data.user.name}`);
        handleClose();

        // Route according to 5-stage approval status
        router.replace(routeForStatus(data.driver_profile.approval_status));
      },
      onError: (err) => {
        setErrorMsg(extractErrorMessage(err) || 'Invalid phone, email or password.');
      },
    });
  };

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Rider Sign In"
      description="Sign in to your AHAAR delivery account"
      footer={
        <View className="gap-3 pt-2">
          {errorMsg && (
            <View className="rounded-xl bg-danger-soft p-3 border border-danger/20">
              <Text className="text-xs font-semibold text-danger">{errorMsg}</Text>
            </View>
          )}

          <Button
            label="Sign In"
            size="lg"
            isLoading={loginMutation.isPending}
            onPress={handleSubmit(onSubmit)}
          />

          <View className="flex-row items-center justify-center gap-1.5 pt-1">
            <Text className="text-sm text-text-secondary">Want to join AHAAR Fleet?</Text>
            <Pressable
              onPress={() => {
                handleClose();
                onOpenRegister();
              }}
            >
              <Text className="text-sm font-bold text-brand-500">Apply as Rider</Text>
            </Pressable>
          </View>
        </View>
      }
    >
      <View className="gap-4">
        <Controller
          control={control}
          name="login"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <Input
              label="Phone or Email"
              placeholder="e.g. 0501234567 or rider@ahaar.com"
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <PasswordInput
              ref={passwordRef}
              label="Password"
              placeholder="Enter your password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={error?.message}
            />
          )}
        />
      </View>
    </Sheet>
  );
}
