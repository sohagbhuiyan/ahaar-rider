import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, Vibration } from 'react-native';

/** Stop ringing after this long even if the rider hasn't answered. */
export const INCOMING_RING_MS = 30_000;

/** Same rhythm as the `ahaar-new-orders` channel; repeats until stopped. */
const VIBRATION_PATTERN = [0, 400, 250, 400, 250, 600, 1200];

const NEW_ORDER_SOUND = require('../../assets/sounds/new_order.wav');

let audioModeSet = false;

function startSound(): AudioPlayer | null {
  try {
    if (!audioModeSet) {
      audioModeSet = true;
      // Ring through the iOS silent switch and lower other apps (music, navigation voice).
      setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers', shouldPlayInBackground: false }).catch(
        () => {
          audioModeSet = false;
        },
      );
    }
    const player = createAudioPlayer(NEW_ORDER_SOUND);
    player.loop = true;
    player.volume = 1;
    player.play();
    return player;
  } catch {
    // No native audio module in this build: vibration still runs.
    return null;
  }
}

function stopSound(player: AudioPlayer | null) {
  if (!player) return;
  try {
    player.pause();
    player.remove();
  } catch {
    // already released
  }
}

/**
 * Loops the new-order sound with a strong repeating vibration while `ringing`
 * is true, for at most {@link INCOMING_RING_MS}. Turning `ringing` off (accept,
 * decline, dismiss) or unmounting stops both at once. `key` restarts the
 * 30 s window for a different order.
 */
export function useIncomingOrderAlert(ringing: boolean, key: number | null) {
  useEffect(() => {
    if (!ringing) return;

    const player = startSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    // Android repeats the pattern natively; iOS repeats a fixed-length buzz.
    Vibration.vibrate(Platform.OS === 'android' ? VIBRATION_PATTERN : [0, 1000], true);

    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      Vibration.cancel();
      stopSound(player);
    };
    const timer = setTimeout(stop, INCOMING_RING_MS);
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [ringing, key]);
}
