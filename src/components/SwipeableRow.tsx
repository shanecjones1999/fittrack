import { useMemo, useRef, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../context/SettingsContext';
import type { AppTheme } from '../theme';

const ACTION_WIDTH = 88;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.35;

type Props = {
  children: ReactNode;
  onDelete: () => void;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function SwipeableRow({ children, onDelete, onPress, style }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const translateX = useRef(new Animated.Value(0)).current;
  const startX = useRef(0);
  const currentX = useRef(0);
  const open = useRef(false);
  /** True only for the active gesture / the press that follows it. */
  const suppressNextPress = useRef(false);
  const clearSuppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animateTo = (toValue: number) => {
    open.current = toValue < 0;
    currentX.current = toValue;
    startX.current = toValue;
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
      speed: 24,
      restDisplacementThreshold: 0.5,
      restSpeedThreshold: 0.5,
    }).start();
  };

  const armPressSuppression = () => {
    suppressNextPress.current = true;
    if (clearSuppressTimer.current) {
      clearTimeout(clearSuppressTimer.current);
    }
    // Clear after the gesture's leftover press (if any) has been delivered.
    clearSuppressTimer.current = setTimeout(() => {
      suppressNextPress.current = false;
      clearSuppressTimer.current = null;
    }, 150);
  };

  const isHorizontalSwipe = (_: unknown, gesture: { dx: number; dy: number }) =>
    Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: isHorizontalSwipe,
      onMoveShouldSetPanResponderCapture: isHorizontalSwipe,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        translateX.stopAnimation((value) => {
          startX.current = value;
          currentX.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const next = Math.min(
          0,
          Math.max(-ACTION_WIDTH, startX.current + gesture.dx)
        );
        if (Math.abs(next - startX.current) > 4) {
          armPressSuppression();
        }
        currentX.current = next;
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldOpen =
          currentX.current <= -OPEN_THRESHOLD ||
          gesture.vx < -0.35 ||
          (open.current && currentX.current < -ACTION_WIDTH * 0.2);

        const shouldClose =
          open.current &&
          (gesture.vx > 0.35 || currentX.current > -OPEN_THRESHOLD);

        if (shouldClose && !shouldOpen) {
          animateTo(0);
        } else if (shouldOpen) {
          animateTo(-ACTION_WIDTH);
        } else {
          animateTo(open.current ? -ACTION_WIDTH : 0);
        }
      },
      onPanResponderTerminate: () => {
        animateTo(currentX.current <= -OPEN_THRESHOLD ? -ACTION_WIDTH : 0);
      },
    })
  ).current;

  const handlePress = () => {
    if (suppressNextPress.current) {
      suppressNextPress.current = false;
      if (clearSuppressTimer.current) {
        clearTimeout(clearSuppressTimer.current);
        clearSuppressTimer.current = null;
      }
      return;
    }
    if (open.current) {
      animateTo(0);
      return;
    }
    onPress?.();
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            animateTo(0);
            onDelete();
          }}
          style={styles.deleteBtn}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View
        style={[styles.foreground, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <Pressable onPress={handlePress}>{children}</Pressable>
      </Animated.View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      overflow: 'hidden',
      backgroundColor: theme.colors.background,
    },
    actions: {
      ...StyleSheet.absoluteFill,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'stretch',
    },
    deleteBtn: {
      width: ACTION_WIDTH,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteText: {
      fontFamily: theme.fonts.sansMedium,
      fontSize: theme.fontSizes.sm,
      color: theme.colors.accentForeground,
    },
    foreground: {
      backgroundColor: theme.colors.background,
    },
  });
}
