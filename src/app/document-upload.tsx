import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { Badge, Button, Card, Input } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api/client';
import {
  useRiderDocuments,
  useSaveVehicle,
  useSubmitForReview,
  useUploadDocument,
} from '@/lib/api/hooks/useRiderDocuments';
import { useAuthStore } from '@/lib/auth/authStore';
import { colors } from '@/lib/theme';

interface DocItem {
  document_type: string;
  title: string;
  status: 'not_submitted' | 'submitted' | 'approved' | 'rejected' | 'expired';
  document_number?: string | null;
  expiry_date?: string | null;
  file_url?: string | null;
  rejection_reason?: string | null;
}

export default function DocumentUploadWizardScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<number>(1);

  // TanStack Query Hooks
  const { data: docsData, isLoading: loadingDocs, refetch } = useRiderDocuments();
  const uploadDocMutation = useUploadDocument();
  const saveVehicleMutation = useSaveVehicle();
  const submitReviewMutation = useSubmitForReview();

  // Step 1: Iqama state
  const [iqamaNumber, setIqamaNumber] = useState('');
  const [iqamaExpiry, setIqamaExpiry] = useState('2028-12-31');
  const [iqamaImage, setIqamaImage] = useState<string | null>(null);

  // Step 2: Driving License state
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('2028-12-31');
  const [licenseImage, setLicenseImage] = useState<string | null>(null);

  // Step 3: Vehicle state
  const [vehicleType, setVehicleType] = useState<'car' | 'bike'>('car');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');

  // Step 4: Istimara state
  const [istimaraExpiry, setIstimaraExpiry] = useState('2028-12-31');
  const [istimaraImage, setIstimaraImage] = useState<string | null>(null);

  useEffect(() => {
    if (docsData) {
      const docs = docsData.documents || [];
      const iqama = docs.find((d) => d.type === 'iqama');
      if (iqama) {
        setIqamaNumber(iqama.document_number || '');
        setIqamaExpiry(iqama.expires_at || '2028-12-31');
        setIqamaImage(iqama.file_url || null);
      }

      const dl = docs.find((d) => d.type === 'driving_license');
      if (dl) {
        setLicenseNumber(dl.document_number || '');
        setLicenseExpiry(dl.expires_at || '2028-12-31');
        setLicenseImage(dl.file_url || null);
      }

      const reg = docs.find((d) => d.type === 'vehicle_registration');
      if (reg) {
        setIstimaraExpiry(reg.expires_at || '2028-12-31');
        setIstimaraImage(reg.file_url || null);
      }

      if (docsData.driver_profile?.vehicle_type) {
        setVehicleType(docsData.driver_profile.vehicle_type);
        setVehiclePlate(docsData.driver_profile.vehicle_plate || '');
        setVehicleModel(docsData.driver_profile.vehicle_model || '');
      }
    }
  }, [docsData]);

  const pickImage = async (setter: (uri: string) => void) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setter(result.assets[0].uri);
      }
    } catch {
      toast.error('Could not select image.');
    }
  };

  const uploadSingleDoc = async (type: string, number: string | null, expiry: string, localUri: string | null) => {
    if (!localUri) {
      toast.error('Please select an image or document file.');
      return false;
    }

    const formData = new FormData();
    formData.append('document_type', type);
    if (number) formData.append('document_number', number);
    if (expiry) formData.append('expiry_date', expiry);

    if (localUri.startsWith('file:') || localUri.startsWith('content:')) {
      const filename = localUri.split('/').pop() || `${type}.jpg`;
      formData.append('file', {
        uri: localUri,
        name: filename,
        type: 'image/jpeg',
      } as unknown as Blob);
    }

    try {
      await uploadDocMutation.mutateAsync(formData);
      return true;
    } catch (err) {
      toast.error(extractErrorMessage(err));
      return false;
    }
  };

  // Step 1 Save
  const handleSaveStep1 = async () => {
    if (!iqamaNumber.trim()) {
      toast.error('Please enter your National ID / Iqama number');
      return;
    }
    const ok = await uploadSingleDoc('iqama', iqamaNumber, iqamaExpiry, iqamaImage);
    if (ok) {
      toast.success('Iqama document saved');
      setCurrentStep(2);
    }
  };

  // Step 2 Save
  const handleSaveStep2 = async () => {
    if (!licenseNumber.trim()) {
      toast.error('Please enter your Driving License number');
      return;
    }
    const ok = await uploadSingleDoc('driving_license', licenseNumber, licenseExpiry, licenseImage);
    if (ok) {
      toast.success('Driving License saved');
      setCurrentStep(3);
    }
  };

  // Step 3 Save Vehicle
  const handleSaveStep3 = async () => {
    if (!vehiclePlate.trim()) {
      toast.error('Please enter vehicle plate number');
      return;
    }
    try {
      await saveVehicleMutation.mutateAsync({
        vehicle_type: vehicleType,
        vehicle_plate: vehiclePlate,
        vehicle_model: vehicleModel || undefined,
      });
      toast.success('Vehicle information saved');
      setCurrentStep(4);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  // Step 4 Save Istimara
  const handleSaveStep4 = async () => {
    const ok = await uploadSingleDoc('vehicle_registration', null, istimaraExpiry, istimaraImage);
    if (ok) {
      toast.success('Vehicle registration saved');
      setCurrentStep(5);
      refetch();
    }
  };

  // Step 5 Final Submission
  const handleFinalSubmit = async () => {
    try {
      await submitReviewMutation.mutateAsync();
      toast.success('Application submitted for final admin review!');
      router.replace('/application-status');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const isSaving =
    uploadDocMutation.isPending ||
    saveVehicleMutation.isPending ||
    submitReviewMutation.isPending;

  if (loadingDocs) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color={colors.brand[500]} />
        <Text className="mt-3 text-sm font-semibold text-text-secondary">Loading document requirements...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border bg-surface px-6 py-4">
        <View>
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
            STAGE 3: DOCUMENT COLLECTION
          </Text>
          <Text className="text-xl font-black text-text-primary mt-0.5">
            Step {currentStep} of 5
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="rounded-full bg-surface-muted px-3 py-1.5 border border-border"
        >
          <Text className="text-xs font-bold text-text-secondary">Save & Exit</Text>
        </Pressable>
      </View>

      {/* Progress Bar */}
      <View className="h-1.5 w-full bg-border flex-row">
        {[1, 2, 3, 4, 5].map((step) => (
          <View
            key={step}
            className={`flex-1 ${step <= currentStep ? 'bg-brand-500' : 'bg-transparent'}`}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        {/* ================================================================= */}
        {/* STEP 1: IQAMA / NATIONAL ID                                       */}
        {/* ================================================================= */}
        {currentStep === 1 && (
          <View className="gap-5">
            <View>
              <Text className="text-2xl font-bold text-text-primary">1. National ID / Iqama</Text>
              <Text className="text-sm text-text-secondary mt-1">
                Provide your valid Saudi National ID or resident Iqama document.
              </Text>
            </View>

            <Input
              label="Iqama / National ID Number"
              placeholder="e.g. 2498765432"
              value={iqamaNumber}
              onChangeText={setIqamaNumber}
              keyboardType="number-pad"
            />

            <Input
              label="Expiry Date (YYYY-MM-DD)"
              placeholder="YYYY-MM-DD"
              value={iqamaExpiry}
              onChangeText={setIqamaExpiry}
            />

            {/* Document Photo Upload */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-text-primary">Document Photo</Text>
              {iqamaImage ? (
                <View className="rounded-2xl border border-border overflow-hidden bg-black/5 items-center justify-center h-48">
                  <Image source={{ uri: iqamaImage }} className="h-full w-full" resizeMode="cover" />
                  <Pressable
                    onPress={() => pickImage(setIqamaImage)}
                    className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1.5"
                  >
                    <Text className="text-xs font-bold text-white">Change Photo</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => pickImage(setIqamaImage)}
                  className="rounded-2xl border-2 border-dashed border-border bg-surface p-6 items-center justify-center gap-2"
                >
                  <Text className="text-3xl">📄</Text>
                  <Text className="font-bold text-sm text-brand-500">Upload Iqama Photo</Text>
                  <Text className="text-xs text-text-muted">Clear photo of the front side (JPEG/PNG)</Text>
                </Pressable>
              )}
            </View>

            <Button
              label="Save & Continue to License"
              size="lg"
              loading={isSaving}
              onPress={handleSaveStep1}
              className="mt-4"
            />
          </View>
        )}

        {/* ================================================================= */}
        {/* STEP 2: DRIVING LICENSE                                          */}
        {/* ================================================================= */}
        {currentStep === 2 && (
          <View className="gap-5">
            <View>
              <Text className="text-2xl font-bold text-text-primary">2. Driving License</Text>
              <Text className="text-sm text-text-secondary mt-1">
                Upload your official driving license for your operating vehicle category.
              </Text>
            </View>

            <Input
              label="Driving License Number"
              placeholder="e.g. LIC-98271"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
            />

            <Input
              label="Expiry Date (YYYY-MM-DD)"
              placeholder="YYYY-MM-DD"
              value={licenseExpiry}
              onChangeText={setLicenseExpiry}
            />

            {/* License Photo */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-text-primary">License Photo</Text>
              {licenseImage ? (
                <View className="rounded-2xl border border-border overflow-hidden bg-black/5 items-center justify-center h-48">
                  <Image source={{ uri: licenseImage }} className="h-full w-full" resizeMode="cover" />
                  <Pressable
                    onPress={() => pickImage(setLicenseImage)}
                    className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1.5"
                  >
                    <Text className="text-xs font-bold text-white">Change Photo</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => pickImage(setLicenseImage)}
                  className="rounded-2xl border-2 border-dashed border-border bg-surface p-6 items-center justify-center gap-2"
                >
                  <Text className="text-3xl">🪪</Text>
                  <Text className="font-bold text-sm text-brand-500">Upload License Photo</Text>
                  <Text className="text-xs text-text-muted">Valid motorcycle or motor vehicle license</Text>
                </Pressable>
              )}
            </View>

            <View className="flex-row gap-3 mt-4">
              <Button
                label="Back"
                variant="outline"
                size="lg"
                onPress={() => setCurrentStep(1)}
                className="flex-1"
              />
              <Button
                label="Save & Continue"
                size="lg"
                loading={isSaving}
                onPress={handleSaveStep2}
                className="flex-2"
              />
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* STEP 3: VEHICLE INFORMATION (CAR VS BIKE ENFORCEMENT)            */}
        {/* ================================================================= */}
        {currentStep === 3 && (
          <View className="gap-5">
            <View>
              <Text className="text-2xl font-bold text-text-primary">3. Vehicle Information</Text>
              <Text className="text-sm text-text-secondary mt-1">
                Select your delivery vehicle type. This strictly determines your delivery track.
              </Text>
            </View>

            {/* Vehicle Selection Cards */}
            <View className="gap-3">
              <Pressable
                onPress={() => setVehicleType('car')}
                className={`rounded-2xl border p-4.5 ${
                  vehicleType === 'car' ? 'border-brand-500 bg-brand-50' : 'border-border bg-surface'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <Text className="text-3xl">🚗</Text>
                    <View>
                      <Text className="text-base font-bold text-text-primary">Car / Van</Text>
                      <Text className="text-xs font-semibold text-brand-500 uppercase tracking-wide">
                        Catering & Meal Plan Track
                      </Text>
                    </View>
                  </View>
                  <View
                    className={`h-5 w-5 rounded-full border items-center justify-center ${
                      vehicleType === 'car' ? 'border-brand-500 bg-brand-500' : 'border-border bg-white'
                    }`}
                  >
                    {vehicleType === 'car' ? <View className="h-2 w-2 rounded-full bg-white" /> : null}
                  </View>
                </View>
                <Text className="text-xs text-text-secondary mt-2.5 leading-5">
                  Assigned multi-stop subscription catering runs (10–18 deliveries per run). Thermal bag capacity required.
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setVehicleType('bike')}
                className={`rounded-2xl border p-4.5 ${
                  vehicleType === 'bike' ? 'border-brand-500 bg-brand-50' : 'border-border bg-surface'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <Text className="text-3xl">🏍️</Text>
                    <View>
                      <Text className="text-base font-bold text-text-primary">Motorcycle / Scooter</Text>
                      <Text className="text-xs font-semibold text-info uppercase tracking-wide">
                        Instant Food Delivery Track
                      </Text>
                    </View>
                  </View>
                  <View
                    className={`h-5 w-5 rounded-full border items-center justify-center ${
                      vehicleType === 'bike' ? 'border-brand-500 bg-brand-500' : 'border-border bg-white'
                    }`}
                  >
                    {vehicleType === 'bike' ? <View className="h-2 w-2 rounded-full bg-white" /> : null}
                  </View>
                </View>
                <Text className="text-xs text-text-secondary mt-2.5 leading-5">
                  Point-to-point daily walk-in orders. Single pickup and immediate direct delivery.
                </Text>
              </Pressable>
            </View>

            <Input
              label="Vehicle License Plate Number"
              placeholder="e.g. 1234-XYZ"
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              autoCapitalize="characters"
            />

            <Input
              label="Vehicle Make & Model (Optional)"
              placeholder="e.g. Toyota Yaris 2023 or Honda 150"
              value={vehicleModel}
              onChangeText={setVehicleModel}
            />

            <View className="flex-row gap-3 mt-4">
              <Button
                label="Back"
                variant="outline"
                size="lg"
                onPress={() => setCurrentStep(2)}
                className="flex-1"
              />
              <Button
                label="Save & Continue"
                size="lg"
                loading={isSaving}
                onPress={handleSaveStep3}
                className="flex-2"
              />
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* STEP 4: ISTIMARA (VEHICLE REGISTRATION)                          */}
        {/* ================================================================= */}
        {currentStep === 4 && (
          <View className="gap-5">
            <View>
              <Text className="text-2xl font-bold text-text-primary">4. Vehicle Registration (Istimara)</Text>
              <Text className="text-sm text-text-secondary mt-1">
                Upload your valid vehicle registration card / Istimara document.
              </Text>
            </View>

            <Input
              label="Istimara Expiry Date (YYYY-MM-DD)"
              placeholder="YYYY-MM-DD"
              value={istimaraExpiry}
              onChangeText={setIstimaraExpiry}
            />

            {/* Istimara Photo */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-text-primary">Istimara Document Photo</Text>
              {istimaraImage ? (
                <View className="rounded-2xl border border-border overflow-hidden bg-black/5 items-center justify-center h-48">
                  <Image source={{ uri: istimaraImage }} className="h-full w-full" resizeMode="cover" />
                  <Pressable
                    onPress={() => pickImage(setIstimaraImage)}
                    className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1.5"
                  >
                    <Text className="text-xs font-bold text-white">Change Photo</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => pickImage(setIstimaraImage)}
                  className="rounded-2xl border-2 border-dashed border-border bg-surface p-6 items-center justify-center gap-2"
                >
                  <Text className="text-3xl">📑</Text>
                  <Text className="font-bold text-sm text-brand-500">Upload Istimara Photo</Text>
                  <Text className="text-xs text-text-muted">Clear photo of registration card</Text>
                </Pressable>
              )}
            </View>

            <View className="flex-row gap-3 mt-4">
              <Button
                label="Back"
                variant="outline"
                size="lg"
                onPress={() => setCurrentStep(3)}
                className="flex-1"
              />
              <Button
                label="Save & Review"
                size="lg"
                loading={isSaving}
                onPress={handleSaveStep4}
                className="flex-2"
              />
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* STEP 5: REVIEW & FINAL SUBMISSION                                */}
        {/* ================================================================= */}
        {currentStep === 5 && (
          <View className="gap-5">
            <View>
              <Text className="text-2xl font-bold text-text-primary">5. Review & Submit</Text>
              <Text className="text-sm text-text-secondary mt-1">
                Review your uploaded documents and vehicle information before final submission.
              </Text>
            </View>

            {/* Checklist summary cards */}
            <Card className="gap-3.5 bg-surface">
              <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                DOCUMENT STATUS CHECKLIST
              </Text>

              {(docsData?.documents || []).map((item) => (
                <View
                  key={item.id}
                  className="flex-row items-center justify-between border-b border-border pb-3 last:border-b-0"
                >
                  <View className="flex-1 pr-3">
                    <Text className="font-bold text-sm text-text-primary">
                      {item.type.replace('_', ' ').toUpperCase()}
                    </Text>
                    {item.rejection_reason ? (
                      <Text className="text-xs font-medium text-danger mt-0.5">
                        • Rejection: {item.rejection_reason}
                      </Text>
                    ) : item.expires_at ? (
                      <Text className="text-xs text-text-muted mt-0.5">
                        Expires: {item.expires_at}
                      </Text>
                    ) : null}
                  </View>

                  <Badge
                    label={
                      item.status === 'approved'
                        ? 'Approved'
                        : item.status === 'rejected'
                        ? 'Rejected'
                        : item.status === 'submitted'
                        ? 'Uploaded'
                        : 'Missing'
                    }
                    variant={
                      item.status === 'approved'
                        ? 'success'
                        : item.status === 'rejected'
                        ? 'danger'
                        : item.status === 'submitted'
                        ? 'brand'
                        : 'warning'
                    }
                  />
                </View>
              ))}

              <View className="border-t border-border pt-3 flex-row items-center justify-between">
                <View>
                  <Text className="font-bold text-sm text-text-primary">Assigned Vehicle</Text>
                  <Text className="text-xs text-text-secondary mt-0.5">
                    {vehicleType === 'car' ? 'Car (Catering Batches)' : 'Bike (Instant Orders)'} · {vehiclePlate}
                  </Text>
                </View>
                <Badge label={vehicleType.toUpperCase()} variant="brand" />
              </View>
            </Card>

            <View className="flex-row gap-3 mt-4">
              <Button
                label="Edit Documents"
                variant="outline"
                size="lg"
                onPress={() => setCurrentStep(1)}
                className="flex-1"
              />
              <Button
                label="Submit for Final Review"
                size="lg"
                loading={isSaving}
                onPress={handleFinalSubmit}
                className="flex-2"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
