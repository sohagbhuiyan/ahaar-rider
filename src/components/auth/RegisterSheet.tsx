import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, Text, View, type TextInput } from 'react-native';
import { toast } from 'sonner-native';
import { z } from 'zod';

import { Button, Input, PasswordInput, Sheet } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api/client';
import { useRegister } from '@/lib/api/hooks/useRiderAuth';

const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name').max(120),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    phone: z.string().min(8, 'Enter a valid phone number (min 8 digits)'),
    branch_id: z.number().int().positive('Please select your delivery branch'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ['password_confirmation'],
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
}

const BRANCHES = [
  { id: 1, name: 'Central Hub', area: 'Al Olaya / King Fahd' },
  { id: 2, name: 'North Hub', area: 'Al Malqa / Anas Ibn Malik' },
  { id: 3, name: 'East Hub', area: 'Al Rawdah / Khurais' },
];

export function RegisterSheet({ open, onClose, onOpenLogin }: Props) {
  const router = useRouter();
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const registerMutation = useRegister();

  const { control, handleSubmit, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      branch_id: 1,
      password: '',
      password_confirmation: '',
    },
  });

  const selectedBranch = useWatch({ control, name: 'branch_id' });

  const handleClose = () => {
    reset();
    setErrorMsg(null);
    onClose();
  };

  const onSubmit = (values: FormValues) => {
    setErrorMsg(null);
    registerMutation.mutate(values, {
      onSuccess: () => {
        toast.success('Registration submitted for initial review!');
        handleClose();
        router.replace('/application-status');
      },
      onError: (err) => {
        const msg = extractErrorMessage(err) || 'Registration failed';
        setErrorMsg(msg);
        toast.error(msg);
      },
    });
  };

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Rider Application — Step 1"
      description="Enter your basic details to apply. Verification documents are collected after initial approval."
      footer={
        <View className="gap-3">
          <Button
            label="Submit Application"
            size="lg"
            loading={registerMutation.isPending}
            onPress={handleSubmit(onSubmit)}
          />

          <View className="flex-row items-center justify-center gap-1.5 pb-2">
            <Text className="text-sm text-text-secondary">Already applied?</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                handleClose();
                onOpenLogin();
              }}
            >
              <Text className="text-sm font-bold text-brand-500">Sign in to check status</Text>
            </Pressable>
          </View>
        </View>
      }
    >
      <View className="gap-4 py-2">
        {errorMsg ? (
          <View className="rounded-xl bg-danger-soft p-3 border border-danger/20">
            <Text className="text-sm font-medium text-danger">{errorMsg}</Text>
          </View>
        ) : null}

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <Input
              label="Full Name"
              placeholder="e.g. Tariq Mansoor"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <Input
              ref={emailRef}
              label="Email Address"
              placeholder="e.g. tariq@example.com"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <Input
              ref={phoneRef}
              label="Phone Number"
              placeholder="e.g. +966501234567"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          )}
        />

        {/* Branch Selection */}
        <View className="gap-1.5">
          <Text className="text-sm font-semibold text-text-primary">Operating Branch Hub</Text>
          <View className="gap-2">
            {BRANCHES.map((b) => {
              const isSelected = selectedBranch === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setValue('branch_id', b.id, { shouldValidate: true })}
                  className={`flex-row items-center justify-between rounded-2xl border p-3.5 ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-border bg-surface'
                  }`}
                >
                  <View>
                    <Text className={`font-bold text-sm ${isSelected ? 'text-brand-700' : 'text-text-primary'}`}>
                      {b.name}
                    </Text>
                    <Text className="text-xs text-text-secondary mt-0.5">{b.area}</Text>
                  </View>
                  <View
                    className={`h-5 w-5 rounded-full border items-center justify-center ${
                      isSelected ? 'border-brand-500 bg-brand-500' : 'border-border bg-white'
                    }`}
                  >
                    {isSelected ? <View className="h-2 w-2 rounded-full bg-white" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <PasswordInput
              ref={passwordRef}
              label="Create Password"
              placeholder="At least 8 characters"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
          )}
        />

        <Controller
          control={control}
          name="password_confirmation"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <PasswordInput
              ref={confirmRef}
              label="Confirm Password"
              placeholder="Re-enter password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />
      </View>
    </Sheet>
  );
}
