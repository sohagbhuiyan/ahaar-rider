import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  KEYBOARD_STATUS,
  useBottomSheetInternal,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
  type BottomSheetScrollViewMethods,
} from '@gorhom/bottom-sheet';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  BackHandler,
  Keyboard,
  Platform,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

import { SheetContext, type SheetContextValue } from './sheetContext';
import { scrollOffsetToReveal } from './sheetScroll';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const MAX_HEIGHT_RATIO = 0.9;
const LAYOUT_SETTLE_MS = 100;
const KEYBOARD_SETTLE_MS = 60;

const SHEET_BACKGROUND = {
  backgroundColor: colors.surface.DEFAULT,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
};

export function Sheet({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  className,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const modalRef = useRef<BottomSheetModal>(null);

  const scrollRef = useRef<BottomSheetScrollViewMethods>(null);
  const contentRef = useRef<View>(null);
  const focusedFieldRef = useRef<View | null>(null);
  const scrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const openRef = useRef(open);
  const presentedRef = useRef(false);
  const closeRequestedRef = useRef(false);

  const syncPresentation = useCallback(() => {
    const modal = modalRef.current;
    if (!modal) return;

    if (openRef.current && !presentedRef.current) {
      presentedRef.current = true;
      closeRequestedRef.current = false;
      modal.present();
    } else if (!openRef.current && presentedRef.current && !closeRequestedRef.current) {
      closeRequestedRef.current = true;
      modal.dismiss();
    }
  }, []);

  useEffect(() => {
    openRef.current = open;
    syncPresentation();
  }, [open, syncPresentation]);

  const handleDismiss = useCallback(() => {
    presentedRef.current = false;
    focusedFieldRef.current = null;
    scrollOffsetRef.current = 0;

    const closeWasRequested = closeRequestedRef.current;
    closeRequestedRef.current = false;
    if (!openRef.current) return;

    if (closeWasRequested) {
      setTimeout(syncPresentation, 0);
    } else {
      onClose();
    }
  }, [onClose, syncPresentation]);

  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [open, onClose]);

  const hasFooter = footer !== undefined && footer !== null && footer !== false;
  const [footerSlot] = useState(() => createSlot(footer));
  useLayoutEffect(() => {
    footerSlot.set(footer);
  }, [footerSlot, footer]);

  const [footerHeight, setFooterHeight] = useState(0);
  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    setFooterHeight(Math.round(event.nativeEvent.layout.height));
  }, []);

  // How much of the scroll viewport sits behind the keyboard. A tall sheet is
  // pushed up by the keyboard only until it hits the top inset; the rest of it
  // stays under the keyboard while the scroll view keeps its full height, so
  // without this the last fields can never be scrolled into view.
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
  const keyboardOverlapRef = useRef(0);

  const revealFocusedField = useCallback(() => {
    const field = focusedFieldRef.current;
    const content = contentRef.current;
    if (!field || !content) return;

    field.measureLayout(content, (_x, y, _width, height) => {
      const offset = scrollOffsetToReveal({
        fieldTop: y,
        fieldHeight: height,
        scrollOffset: scrollOffsetRef.current,
        visibleHeight:
          viewportHeightRef.current -
          (hasFooter ? footerHeight : 0) -
          keyboardOverlapRef.current,
      });
      if (offset !== null) scrollRef.current?.scrollTo({ y: offset, animated: true });
    });
  }, [hasFooter, footerHeight]);

  useEffect(() => {
    if (!open) return;

    let measureTimer: ReturnType<typeof setTimeout> | undefined;

    const applyOverlap = (next: number) => {
      keyboardOverlapRef.current = next;
      setKeyboardOverlap(next);
      // Let the new bottom padding land before scrolling the field into view.
      setTimeout(revealFocusedField, 16);
    };

    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      const keyboardTop = event.endCoordinates.screenY;
      clearTimeout(measureTimer);
      // The sheet animates alongside the keyboard; measure once it has settled.
      measureTimer = setTimeout(() => {
        contentRef.current?.measureInWindow((_x, contentY) => {
          const viewportBottom = contentY + scrollOffsetRef.current + viewportHeightRef.current;
          applyOverlap(Math.max(0, Math.round(viewportBottom - keyboardTop)));
        });
      }, KEYBOARD_SETTLE_MS);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      clearTimeout(measureTimer);
      applyOverlap(0);
    });

    return () => {
      clearTimeout(measureTimer);
      showSub.remove();
      hideSub.remove();
      keyboardOverlapRef.current = 0;
      setKeyboardOverlap(0);
    };
  }, [open, revealFocusedField]);

  const sheetContext = useMemo<SheetContextValue>(
    () => ({
      onFieldFocus: (field) => {
        focusedFieldRef.current = field;
        revealFocusedField();
      },
      onFieldBlur: (field) => {
        if (focusedFieldRef.current === field) focusedFieldRef.current = null;
      },
    }),
    [revealFocusedField],
  );

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const handleScrollLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeightRef.current = event.nativeEvent.layout.height;
      if (!focusedFieldRef.current) return;
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(revealFocusedField, LAYOUT_SETTLE_MS);
    },
    [revealFocusedField],
  );

  useEffect(() => () => clearTimeout(settleTimerRef.current), []);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <SheetFooter
          slot={footerSlot}
          bottomInset={insets.bottom}
          onLayout={handleFooterLayout}
        />
      </BottomSheetFooter>
    ),
    [footerSlot, insets.bottom, handleFooterLayout],
  );

  const renderHandle = useCallback(
    () => <SheetHandle title={title} description={description} />,
    [title, description],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      onDismiss={handleDismiss}
      enablePanDownToClose
      enableDynamicSizing
      maxDynamicContentSize={Math.round(windowHeight * MAX_HEIGHT_RATIO)}
      topInset={insets.top}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustPan"
      handleComponent={renderHandle}
      backdropComponent={renderBackdrop}
      footerComponent={hasFooter ? renderFooter : undefined}
      backgroundStyle={SHEET_BACKGROUND}
      containerComponent={Platform.OS === 'ios' ? OverlayContainer : undefined}
    >
      <BottomSheetScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onLayout={handleScrollLayout}
        contentContainerStyle={{
          paddingBottom: (hasFooter ? footerHeight + 16 : insets.bottom + 16) + keyboardOverlap,
        }}
      >
        <SheetContext.Provider value={sheetContext}>
          <View ref={contentRef} collapsable={false}>
            <View className={cn('px-5', className)}>{children}</View>
          </View>
        </SheetContext.Provider>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function SheetHandle({ title, description }: { title?: string; description?: string }) {
  return (
    <View>
      <View className="items-center pb-1 pt-3">
        <View className="h-1 w-10 rounded-full bg-border" />
      </View>

      {title ? (
        <View className="px-5 pb-3 pt-2">
          <Text className="text-lg font-bold text-text-primary">{title}</Text>
          {description ? (
            <Text className="mt-1 text-sm text-text-secondary">{description}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function SheetFooter({
  slot,
  bottomInset,
  onLayout,
}: {
  slot: FooterSlot;
  bottomInset: number;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  const node = useSyncExternalStore(slot.subscribe, slot.get, slot.get);
  const { animatedKeyboardState } = useBottomSheetInternal();

  const spacerStyle = useAnimatedStyle(
    () => ({
      height:
        16 +
        (animatedKeyboardState.get().status === KEYBOARD_STATUS.SHOWN ? 0 : bottomInset),
    }),
    [bottomInset, animatedKeyboardState],
  );

  return (
    <View onLayout={onLayout} className="border-t border-border bg-surface px-5 pt-4">
      {node}
      <Animated.View style={spacerStyle} />
    </View>
  );
}

function OverlayContainer({ children }: PropsWithChildren) {
  return (
    <FullWindowOverlay>
      <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>
    </FullWindowOverlay>
  );
}

function createSlot(initial: ReactNode) {
  let current = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => current,
    set: (next: ReactNode) => {
      if (next === current) return;
      current = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

type FooterSlot = ReturnType<typeof createSlot>;
