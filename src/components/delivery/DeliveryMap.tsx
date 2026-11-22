import Constants from 'expo-constants';
import { useEffect, useMemo, useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  /** Short text inside the pin (stop number, "K" for kitchen...). */
  label: string;
  tone?: 'brand' | 'info' | 'success' | 'muted' | 'danger';
  highlighted?: boolean;
}

const TONE: Record<NonNullable<MapPin['tone']>, string> = {
  brand: colors.brand[500],
  info: colors.status.info,
  success: colors.status.success,
  muted: colors.text.muted,
  danger: colors.status.danger,
};

/**
 * Android draws Google Maps, which needs GOOGLE_MAPS_ANDROID_API_KEY baked
 * into the build (app.config.ts sets `extra.googleMapsAndroid`); without it
 * the map is grey, so callers show the details without a map instead.
 * iOS falls back to Apple Maps, which needs no key.
 */
export function mapsAvailable(): boolean {
  if (Platform.OS === 'android') return Boolean(Constants.expoConfig?.extra?.googleMapsAndroid);
  return Platform.OS === 'ios';
}

interface Props {
  pins: MapPin[];
  className?: string;
  height?: number;
}

export function DeliveryMap({ pins, className, height = 220 }: Props) {
  const ref = useRef<MapView>(null);
  const valid = useMemo(
    () => pins.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [pins],
  );
  const fitKey = valid.map((p) => `${p.id}:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');

  useEffect(() => {
    if (valid.length < 2) return;
    const t = setTimeout(() => {
      ref.current?.fitToCoordinates(
        valid.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        { edgePadding: { top: 48, right: 48, bottom: 48, left: 48 }, animated: true },
      );
    }, 300);
    return () => clearTimeout(t);
    // Refit only when the set of pins changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  if (!mapsAvailable() || valid.length === 0) return null;

  const first = valid[0];

  return (
    <View className={cn('overflow-hidden rounded-2xl border border-border bg-surface-muted', className)} style={{ height }}>
      <MapView
        ref={ref}
        style={{ flex: 1 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        initialRegion={{
          latitude: first.lat,
          longitude: first.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {valid.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            title={pin.title}
            description={pin.description}
            zIndex={pin.highlighted ? 10 : 1}
          >
            <View
              style={{
                minWidth: pin.highlighted ? 34 : 28,
                height: pin.highlighted ? 34 : 28,
                paddingHorizontal: 6,
                borderRadius: 17,
                backgroundColor: TONE[pin.tone ?? 'brand'],
                borderWidth: pin.highlighted ? 3 : 2,
                borderColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: pin.highlighted ? 13 : 11 }}>
                {pin.label}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
