import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * `app.json` plus what can't be static: the Google Maps keys for
 * `react-native-maps`.
 *
 * The map is drawn by the native Google Maps SDK, which reads its key from the
 * native project at build time, so these are build-time variables, not
 * `EXPO_PUBLIC_*` ones, and changing them means a new build.
 *
 *   GOOGLE_MAPS_ANDROID_API_KEY  Maps SDK for Android, restricted to package
 *                                `store.ahaarrider` and the build's SHA-1.
 *   GOOGLE_MAPS_IOS_API_KEY      Optional; without it iOS draws Apple Maps.
 *
 * Set them as EAS environment variables for cloud builds
 * (`eas env:create --name GOOGLE_MAPS_ANDROID_API_KEY ...`), or in `.env.local`
 * for a local `expo prebuild`.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'ahaar-rider',
  slug: config.slug ?? 'ahaar-rider',
  extra: {
    ...config.extra,
    // Without a key Android's Google map renders grey, so screens show the
    // job details without a map. Keep the variable set when running
    // `expo start` too, or the flag won't match the build.
    googleMapsAndroid: Boolean(process.env.GOOGLE_MAPS_ANDROID_API_KEY),
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
        iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY,
      },
    ],
  ],
});
