import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { Badge, Button, Card, DateField, ErrorState, Input } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api/client';
import {
  useRiderDocuments,
  useSaveVehicle,
  useSubmitForReview,
  useUploadDocument,
} from '@/lib/api/hooks/useRiderDocuments';
import type {
  ChecklistItem,
  DocumentType,
  DocumentsResponse,
  VehicleInfo,
  VehicleType,
} from '@/lib/api/types';
import {
  ITEM_STATUS_LABEL,
  ITEM_STATUS_VARIANT,
  needsAction,
  validateExpiry,
} from '@/lib/onboarding';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

// ───────────────────────────── steps ─────────────────────────────

type StepKey = DocumentType | 'vehicle' | 'review';

const STEPS: { key: StepKey; short: string }[] = [
  { key: 'iqama', short: 'Iqama' },
  { key: 'driving_license', short: 'License' },
  { key: 'vehicle', short: 'Vehicle' },
  { key: 'vehicle_registration', short: 'Istimara' },
  { key: 'review', short: 'Review' },
];

const DOC_COPY: Record<DocumentType, { heading: string; help: string; numberLabel: string; numberHint: string; icon: string }> = {
  iqama: {
    heading: 'National ID / Iqama',
    help: 'Your valid Saudi National ID or resident Iqama.',
    numberLabel: 'Iqama / National ID number',
    numberHint: 'e.g. 2498765432',
    icon: '🪪',
  },
  driving_license: {
    heading: 'Driving License',
    help: 'A valid license for the vehicle you will deliver with.',
    numberLabel: 'Driving license number',
    numberHint: 'e.g. 1098765432',
    icon: '🚦',
  },
  vehicle_registration: {
    heading: 'Vehicle Registration (Istimara)',
    help: 'The registration card of the vehicle you entered in the previous step.',
    numberLabel: 'Istimara number (optional)',
    numberHint: 'Optional',
    icon: '📑',
  },
};

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

interface DocDraft {
  number: string;
  expiry: string;
  file: PickedFile | null;
}

interface VehicleDraft {
  type: VehicleType | null;
  plate: string;
  model: string;
}

function firstOpenStep(data: DocumentsResponse): number {
  const byType = new Map(data.checklist.map((d) => [d.document_type, d]));
  const index = STEPS.findIndex(({ key }) => {
    if (key === 'review') return true;
    if (key === 'vehicle') return !data.vehicle_info.is_submitted || data.vehicle_info.status === 'rejected';
    const item = byType.get(key);
    return !item || needsAction(item.status);
  });
  return Math.max(0, index);
}

function tomorrow(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

function draftFrom(item: ChecklistItem | undefined): DocDraft {
  return { number: item?.document_number ?? '', expiry: item?.expiry_date ?? '', file: null };
}

function vehicleDraftFrom(v: VehicleInfo | undefined): VehicleDraft {
  return { type: v?.vehicle_type ?? null, plate: v?.vehicle_plate ?? '', model: v?.vehicle_model ?? '' };
}

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'pdf') return 'application/pdf';
  return 'image/jpeg';
}

// ───────────────────────────── screen ─────────────────────────────

export default function DocumentWizardScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useRiderDocuments();
  const uploadMutation = useUploadDocument();
  const vehicleMutation = useSaveVehicle();
  const submitMutation = useSubmitForReview();

  const [step, setStep] = useState(0);
  const [drafts, setDrafts] = useState<Record<DocumentType, DocDraft>>({
    iqama: draftFrom(undefined),
    driving_license: draftFrom(undefined),
    vehicle_registration: draftFrom(undefined),
  });
  const [vehicle, setVehicle] = useState<VehicleDraft>(vehicleDraftFrom(undefined));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [progress, setProgress] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const initialised = useRef(false);

  // Hydrate once from the server, then resume at the first unfinished step.
  useEffect(() => {
    if (!data || initialised.current) return;
    initialised.current = true;
    const byType = new Map(data.checklist.map((d) => [d.document_type, d]));
    setDrafts({
      iqama: draftFrom(byType.get('iqama')),
      driving_license: draftFrom(byType.get('driving_license')),
      vehicle_registration: draftFrom(byType.get('vehicle_registration')),
    });
    setVehicle(vehicleDraftFrom(data.vehicle_info));
    setStep(data.can_edit ? firstOpenStep(data) : STEPS.length - 1);
  }, [data]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const goToStatus = () => router.replace('/application-status');

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color={colors.brand[500]} />
        <Text className="mt-3 text-sm font-semibold text-text-secondary">Loading your documents…</Text>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6">
        <ErrorState
          title="Couldn't load your documents"
          message="Check your connection and try again."
          onRetry={() => refetch()}
        />
        <Button label="Back to status" variant="outline" className="mt-4" onPress={goToStatus} />
      </SafeAreaView>
    );
  }

  const byType = new Map(data.checklist.map((d) => [d.document_type, d]));
  const canEdit = data.can_edit;
  const current = STEPS[step];
  const busy = uploadMutation.isPending || vehicleMutation.isPending || submitMutation.isPending;
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const stepStatus = (key: StepKey) => {
    if (key === 'review') return null;
    if (key === 'vehicle') return data.vehicle_info.status;
    return byType.get(key)?.status ?? 'not_submitted';
  };

  // ── save handlers ──

  const saveDocument = async (type: DocumentType) => {
    const item = byType.get(type);
    const draft = drafts[type];
    const locked = !canEdit || item?.status === 'approved';
    const dirty =
      draft.file !== null ||
      draft.number.trim() !== (item?.document_number ?? '') ||
      draft.expiry.trim() !== (item?.expiry_date ?? '');

    // Nothing changed on an item the server already has → just move on.
    if (locked || (!dirty && item && !needsAction(item.status))) {
      next();
      return;
    }

    const nextErrors: Record<string, string | undefined> = {};
    if (item?.number_required && !draft.number.trim()) nextErrors.number = 'Document number is required';
    nextErrors.expiry = validateExpiry(draft.expiry) ?? undefined;
    if (!draft.file) {
      nextErrors.file = item?.file_url
        ? 'Attach the document again to update its details'
        : 'Please attach a photo of the document';
    }
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const form = new FormData();
    form.append('document_type', type);
    if (draft.number.trim()) form.append('document_number', draft.number.trim());
    form.append('expiry_date', draft.expiry.trim());
    form.append('file', { uri: draft.file!.uri, name: draft.file!.name, type: draft.file!.mimeType } as unknown as Blob);

    setProgress(0);
    try {
      const fresh = await uploadMutation.mutateAsync({ formData: form, onProgress: setProgress });
      const saved = fresh.checklist.find((d) => d.document_type === type);
      setDrafts((d) => ({ ...d, [type]: draftFrom(saved) }));
      toast.success(`${DOC_COPY[type].heading} saved`);
      next();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setProgress(null);
    }
  };

  const saveVehicle = async () => {
    const info = data.vehicle_info;
    const locked = !canEdit || info.status === 'approved';
    const dirty =
      vehicle.type !== info.vehicle_type ||
      vehicle.plate.trim().toUpperCase() !== (info.vehicle_plate ?? '') ||
      vehicle.model.trim() !== (info.vehicle_model ?? '');

    if (locked || (!dirty && info.is_submitted && info.status !== 'rejected')) {
      next();
      return;
    }

    const nextErrors: Record<string, string | undefined> = {
      vehicleType: vehicle.type ? undefined : 'Choose car or bike',
      plate: vehicle.plate.trim().length >= 2 ? undefined : 'Enter your plate number',
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      const res = await vehicleMutation.mutateAsync({
        vehicle_type: vehicle.type!,
        vehicle_plate: vehicle.plate.trim(),
        vehicle_model: vehicle.model.trim() || undefined,
      });
      setVehicle(vehicleDraftFrom(res.documents.vehicle_info));
      toast.success('Vehicle information saved');
      next();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const submit = async () => {
    try {
      await submitMutation.mutateAsync();
      toast.success('Submitted for review');
      goToStatus();
    } catch (err) {
      toast.error(extractErrorMessage(err));
      refetch();
    }
  };

  const pickFile = (type: DocumentType) => {
    const launch = async (source: 'camera' | 'library') => {
      try {
        const perm =
          source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          toast.error(source === 'camera' ? 'Camera permission is needed.' : 'Photo library permission is needed.');
          return;
        }
        const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync(options)
            : await ImagePicker.launchImageLibraryAsync(options);
        const asset = result.canceled ? null : result.assets[0];
        if (!asset) return;

        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          toast.error('That file is larger than 10 MB. Please choose a smaller photo.');
          return;
        }
        const name = asset.fileName || asset.uri.split('/').pop() || `${type}.jpg`;
        setDrafts((d) => ({
          ...d,
          [type]: { ...d[type], file: { uri: asset.uri, name, mimeType: asset.mimeType || guessMime(name) } },
        }));
        setErrors((e) => ({ ...e, file: undefined }));
      } catch {
        toast.error('Could not open the picker.');
      }
    };

    Alert.alert('Add document photo', 'Make sure all text is clear and readable.', [
      { text: 'Take photo', onPress: () => launch('camera') },
      { text: 'Choose from library', onPress: () => launch('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── render ──

  return (
    <SafeAreaView className="flex-1 bg-surface-muted" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center justify-between border-b border-border bg-surface px-5 py-4">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">Rider documents</Text>
          <Text className="text-xl font-black text-text-primary mt-0.5">
            Step {step + 1} of {STEPS.length}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={goToStatus}
          className="rounded-full bg-surface-muted px-3 py-1.5 border border-border"
        >
          <Text className="text-xs font-bold text-text-secondary">{canEdit ? 'Save & exit' : 'Close'}</Text>
        </Pressable>
      </View>

      {/* Step pills — tap to jump to any step */}
      <View className="flex-row gap-1.5 bg-surface px-5 pb-3 pt-1">
        {STEPS.map((s, i) => {
          const st = stepStatus(s.key);
          const color =
            st === 'approved'
              ? 'bg-success'
              : st === 'rejected' || st === 'expired'
                ? 'bg-danger'
                : st && st !== 'not_submitted'
                  ? 'bg-brand-500'
                  : 'bg-border';
          return (
            <Pressable
              key={s.key}
              accessibilityRole="button"
              accessibilityLabel={`Go to ${s.short}`}
              onPress={() => !busy && setStep(i)}
              className="flex-1 gap-1"
            >
              <View className={cn('h-1.5 rounded-full', color, i === step && 'opacity-100', i !== step && 'opacity-60')} />
              <Text
                className={cn('text-[10px] text-center', i === step ? 'font-black text-text-primary' : 'text-text-muted')}
                numberOfLines={1}
              >
                {s.short}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 20 }}
        >
          {!canEdit ? (
            <View className="rounded-2xl border border-info/30 bg-info-soft p-4">
              <Text className="text-sm font-bold text-info">View only</Text>
              <Text className="text-xs text-text-secondary mt-1">
                {data.approval_status === 'under_review'
                  ? 'Your documents are with our team for verification. If something needs fixing, you can edit it here.'
                  : 'Documents cannot be changed at this stage.'}
              </Text>
            </View>
          ) : null}

          {current.key === 'vehicle' ? (
            <VehicleStep
              info={data.vehicle_info}
              draft={vehicle}
              onChange={(patch) => {
                setVehicle((v) => ({ ...v, ...patch }));
                setErrors({});
              }}
              readOnly={!canEdit || data.vehicle_info.status === 'approved'}
              errors={errors}
            />
          ) : current.key === 'review' ? (
            <ReviewStep data={data} onEdit={(i) => setStep(i)} />
          ) : (
            <DocumentStep
              type={current.key}
              item={byType.get(current.key)}
              draft={drafts[current.key]}
              onChange={(patch) => {
                const key = current.key as DocumentType;
                setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
                setErrors((e) => ({ ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) }));
              }}
              onPick={() => pickFile(current.key as DocumentType)}
              readOnly={!canEdit || byType.get(current.key)?.status === 'approved'}
              errors={errors}
              progress={progress}
            />
          )}

          {/* Navigation */}
          <View className="flex-row gap-3">
            {step > 0 ? (
              <Button label="Back" variant="outline" size="lg" className="flex-1" disabled={busy} onPress={back} />
            ) : null}
            {current.key === 'review' ? (
              canEdit ? (
                <Button
                  label="Submit for review"
                  size="lg"
                  className="flex-[2]"
                  loading={submitMutation.isPending}
                  disabled={busy || data.submit_blockers.length > 0}
                  onPress={submit}
                />
              ) : (
                <Button label="Back to status" size="lg" className="flex-[2]" onPress={goToStatus} />
              )
            ) : (
              <Button
                label={canEdit ? 'Save & continue' : 'Next'}
                size="lg"
                className="flex-[2]"
                loading={uploadMutation.isPending || vehicleMutation.isPending}
                disabled={busy}
                onPress={() => (current.key === 'vehicle' ? saveVehicle() : saveDocument(current.key as DocumentType))}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ───────────────────────────── document step ─────────────────────────────

function StatusLine({ status, reason, lockedNote }: { status: ChecklistItem['status']; reason?: string | null; lockedNote?: string }) {
  return (
    <View className="gap-2">
      <Badge label={ITEM_STATUS_LABEL[status]} variant={ITEM_STATUS_VARIANT[status]} />
      {status === 'rejected' && reason ? (
        <View className="rounded-xl border border-danger/30 bg-danger-soft p-3">
          <Text className="text-xs font-bold uppercase text-danger">Rejected by admin</Text>
          <Text className="mt-1 text-sm text-danger">{reason}</Text>
          <Text className="mt-1 text-xs text-text-secondary">Upload a new copy below — your other documents stay as they are.</Text>
        </View>
      ) : null}
      {status === 'expired' ? (
        <View className="rounded-xl border border-warning/30 bg-warning-soft p-3">
          <Text className="text-sm text-warning font-semibold">This document has expired. Upload a valid copy.</Text>
        </View>
      ) : null}
      {lockedNote ? <Text className="text-xs text-text-muted">🔒 {lockedNote}</Text> : null}
    </View>
  );
}

function DocumentStep({
  type,
  item,
  draft,
  onChange,
  onPick,
  readOnly,
  errors,
  progress,
}: {
  type: DocumentType;
  item?: ChecklistItem;
  draft: DocDraft;
  onChange: (patch: Partial<DocDraft>) => void;
  onPick: () => void;
  readOnly: boolean;
  errors: Record<string, string | undefined>;
  progress: number | null;
}) {
  const copy = DOC_COPY[type];
  const status = item?.status ?? 'not_submitted';
  const previewUri = draft.file?.uri ?? (item?.file_url && !item.file_is_pdf ? item.file_url : null);
  const hasFile = Boolean(draft.file || item?.file_url);

  return (
    <View className="gap-5">
      <View>
        <Text className="text-2xl font-bold text-text-primary">
          {copy.icon} {copy.heading}
        </Text>
        <Text className="text-sm text-text-secondary mt-1">{copy.help}</Text>
      </View>

      <StatusLine
        status={status}
        reason={item?.rejection_reason}
        lockedNote={status === 'approved' ? 'Approved documents are locked.' : undefined}
      />

      <Input
          label={copy.numberLabel}
          placeholder={copy.numberHint}
          value={draft.number}
          onChangeText={(number) => onChange({ number })}
          editable={!readOnly}
          autoCapitalize="characters"
          error={errors.number}
        />

      <DateField
        label="Expiry date"
        placeholder="Select expiry date"
        value={draft.expiry}
        onChange={(expiry) => onChange({ expiry })}
        editable={!readOnly}
        minimumDate={tomorrow()}
        hint="Must be valid after today"
        error={errors.expiry}
      />

      <View className="gap-2">
        <Text className="text-sm font-semibold text-text-primary">Document photo</Text>
        {hasFile ? (
          <View className="h-52 overflow-hidden rounded-2xl border border-border bg-black/5 items-center justify-center">
            {previewUri ? (
              <Image source={{ uri: previewUri }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <Text className="text-sm font-semibold text-text-secondary">📄 PDF document on file</Text>
            )}
            {draft.file ? (
              <View className="absolute left-3 top-3 rounded-full bg-brand-500 px-2.5 py-1">
                <Text className="text-[10px] font-bold text-text-primary">NEW — not uploaded yet</Text>
              </View>
            ) : null}
            {!readOnly ? (
              <Pressable onPress={onPick} className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1.5">
                <Text className="text-xs font-bold text-white">Replace</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Pressable
            onPress={readOnly ? undefined : onPick}
            className={cn(
              'items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-surface p-6',
              errors.file ? 'border-danger' : 'border-border',
            )}
          >
            <Text className="text-3xl">📷</Text>
            <Text className="font-bold text-sm text-brand-700">Take or choose a photo</Text>
            <Text className="text-xs text-text-muted">Clear, readable, all four corners visible</Text>
          </Pressable>
        )}
        {errors.file ? <Text className="text-xs font-medium text-danger">{errors.file}</Text> : null}

        {progress !== null ? (
          <View className="gap-1">
            <View className="h-2 overflow-hidden rounded-full bg-border">
              <View className="h-full bg-brand-500" style={{ width: `${Math.round(progress * 100)}%` }} />
            </View>
            <Text className="text-xs text-text-secondary">Uploading… {Math.round(progress * 100)}%</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ───────────────────────────── vehicle step ─────────────────────────────

const VEHICLES: { type: VehicleType; icon: string; title: string; track: string; body: string }[] = [
  {
    type: 'car',
    icon: '🚗',
    title: 'Car / Van',
    track: 'Plan / subscription deliveries only',
    body: 'Multi-stop meal-plan routes. You will not receive instant daily orders.',
  },
  {
    type: 'bike',
    icon: '🏍️',
    title: 'Motorcycle / Scooter',
    track: 'Regular / daily deliveries only',
    body: 'Instant point-to-point orders. You will not receive subscription routes.',
  },
];

function VehicleStep({
  info,
  draft,
  onChange,
  readOnly,
  errors,
}: {
  info: VehicleInfo;
  draft: VehicleDraft;
  onChange: (patch: Partial<VehicleDraft>) => void;
  readOnly: boolean;
  errors: Record<string, string | undefined>;
}) {
  return (
    <View className="gap-5">
      <View>
        <Text className="text-2xl font-bold text-text-primary">🛞 Vehicle information</Text>
        <Text className="text-sm text-text-secondary mt-1">Your vehicle decides which deliveries you can receive.</Text>
      </View>

      <StatusLine
        status={info.status}
        reason={info.rejection_reason}
        lockedNote={info.status === 'approved' ? 'Approved vehicle information is locked.' : undefined}
      />

      <View className="gap-3">
        {VEHICLES.map((v) => {
          const selected = draft.type === v.type;
          return (
            <Pressable
              key={v.type}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: readOnly }}
              onPress={readOnly ? undefined : () => onChange({ type: v.type })}
              className={cn(
                'rounded-2xl border p-4',
                selected ? 'border-brand-500 bg-brand-50' : 'border-border bg-surface',
                readOnly && !selected && 'opacity-50',
              )}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1">
                  <Text className="text-3xl">{v.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-text-primary">{v.title}</Text>
                    <Text className="text-xs font-semibold uppercase tracking-wide text-brand-700">{v.track}</Text>
                  </View>
                </View>
                <View
                  className={cn(
                    'h-5 w-5 rounded-full border items-center justify-center',
                    selected ? 'border-brand-500 bg-brand-500' : 'border-border bg-white',
                  )}
                >
                  {selected ? <View className="h-2 w-2 rounded-full bg-white" /> : null}
                </View>
              </View>
              <Text className="text-xs text-text-secondary mt-2.5 leading-5">{v.body}</Text>
            </Pressable>
          );
        })}
        {errors.vehicleType ? <Text className="text-xs font-medium text-danger">{errors.vehicleType}</Text> : null}
      </View>

      <Input
        label="Plate number"
        placeholder="e.g. 1234 ABC"
        value={draft.plate}
        onChangeText={(plate) => onChange({ plate })}
        autoCapitalize="characters"
        editable={!readOnly}
        error={errors.plate}
      />

      <Input
        label="Make & model (optional)"
        placeholder="e.g. Toyota Yaris 2023 or Honda PCX 150"
        value={draft.model}
        onChangeText={(model) => onChange({ model })}
        editable={!readOnly}
      />
    </View>
  );
}

// ───────────────────────────── review step ─────────────────────────────

function ReviewStep({ data, onEdit }: { data: DocumentsResponse; onEdit: (step: number) => void }) {
  const stepOf = (key: StepKey) => STEPS.findIndex((s) => s.key === key);
  const v = data.vehicle_info;

  const rows: { key: StepKey; title: string; detail: string | null; status: ChecklistItem['status']; reason?: string | null }[] = [
    ...data.checklist
      .filter((d) => d.document_type !== 'vehicle_registration')
      .map((d) => ({
        key: d.document_type as StepKey,
        title: d.title,
        detail: d.expiry_date ? `Expires ${d.expiry_date}` : null,
        status: d.status,
        reason: d.rejection_reason,
      })),
    {
      key: 'vehicle',
      title: 'Vehicle information',
      detail: v.vehicle_type ? `${v.vehicle_type === 'car' ? 'Car · plan deliveries' : 'Bike · daily deliveries'} · ${v.vehicle_plate ?? ''}` : null,
      status: v.status,
      reason: v.rejection_reason,
    },
    ...data.checklist
      .filter((d) => d.document_type === 'vehicle_registration')
      .map((d) => ({
        key: d.document_type as StepKey,
        title: d.title,
        detail: d.expiry_date ? `Expires ${d.expiry_date}` : null,
        status: d.status,
        reason: d.rejection_reason,
      })),
  ];

  return (
    <View className="gap-5">
      <View>
        <Text className="text-2xl font-bold text-text-primary">✅ Review & submit</Text>
        <Text className="text-sm text-text-secondary mt-1">
          Check everything below. Once submitted, an admin verifies each item individually.
        </Text>
      </View>

      <Card className="gap-0 p-0 overflow-hidden">
        {rows.map((row, i) => (
          <Pressable
            key={row.key}
            accessibilityRole="button"
            onPress={() => onEdit(stepOf(row.key))}
            className={cn('flex-row items-center gap-3 p-4 active:bg-surface-muted', i > 0 && 'border-t border-border')}
          >
            <View className="flex-1">
              <Text className="text-sm font-bold text-text-primary">{row.title}</Text>
              {row.status === 'rejected' && row.reason ? (
                <Text className="text-xs text-danger mt-0.5">{row.reason}</Text>
              ) : row.detail ? (
                <Text className="text-xs text-text-muted mt-0.5">{row.detail}</Text>
              ) : null}
            </View>
            <Badge label={ITEM_STATUS_LABEL[row.status]} variant={ITEM_STATUS_VARIANT[row.status]} />
            <Text className="text-text-muted">›</Text>
          </Pressable>
        ))}
      </Card>

      {data.can_edit && data.submit_blockers.length > 0 ? (
        <View className="rounded-2xl border border-warning/30 bg-warning-soft p-4 gap-1">
          <Text className="text-sm font-bold text-warning">Before you can submit</Text>
          {data.submit_blockers.map((b) => (
            <Text key={b} className="text-xs text-text-secondary">
              • {b}
            </Text>
          ))}
        </View>
      ) : null}

      {data.can_edit && data.submit_blockers.length === 0 ? (
        <Text className="text-xs text-text-secondary text-center">
          Everything is ready. Submit to send your application for final verification.
        </Text>
      ) : null}
    </View>
  );
}
