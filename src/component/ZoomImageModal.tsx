import React, { useCallback, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ImageLoadEventData,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconXCircle } from '../assets/icon/Xcircle.tsx';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2;
const DOUBLE_TAP_DELAY = 200;
const DOUBLE_TAP_SLOP = 64;
const TAP_SLOP = 8;
const DISMISS_DISTANCE = 120;
// 双击后的第二击按住时，纵向拖动 96px 对应 1 倍缩放变化。
const VERTICAL_ZOOM_DISTANCE = 96;
const PAN_RESISTANCE = 0.35;
const SCALE_EPSILON = 0.01;

/**
 * 手势状态互斥：空闲、单指拖动、双击后按住的纵向滑动缩放，以及双指捏合。
 * 使用数值共享值，确保整套判定都能在 Reanimated UI 线程执行。
 */
const MODE_IDLE = 0;//空闲
const MODE_PAN = 1;//拖动
const MODE_VERTICAL_ZOOM = 2;
const MODE_PINCH = 3;//双指捏放

const SPRING_CONFIG = {
  damping: 20,
  mass: 0.8,
  stiffness: 220,
};

type ZoomImageModalProps = {
  visible: boolean;
  uri?: string | null;
  onRequestClose: () => void;
};

const clampValue = (value: number, minimum: number, maximum: number) => {
  'worklet';
  return Math.min(Math.max(value, minimum), maximum);
};

const distanceBetween = (
  firstX: number,
  firstY: number,
  secondX: number,
  secondY: number,
) => {
  'worklet';
  const x = secondX - firstX;
  const y = secondY - firstY;
  return Math.sqrt(x * x + y * y);
};

const getContainedImageSize = (
  viewportWidth: number,
  viewportHeight: number,
  sourceWidth: number,
  sourceHeight: number,
) => {
  'worklet';

  if (
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    return { height: viewportHeight, width: viewportWidth };
  }

  const fit = Math.min(
    viewportWidth / sourceWidth,
    viewportHeight / sourceHeight,
  );
  return {
    height: sourceHeight * fit,
    width: sourceWidth * fit,
  };
};

/** 拖动越界时按比例衰减位移，保留自然的“拉橡皮筋”反馈。 */
const resistPastBounds = (value: number, bound: number) => {
  'worklet';

  if (value > bound) {
    return bound + (value - bound) * PAN_RESISTANCE;
  }
  if (value < -bound) {
    return -bound + (value + bound) * PAN_RESISTANCE;
  }
  return value;
};

/**
 * 以 contain 后的图片尺寸计算可平移边界。
 * 拖动过程中可以保留越界阻尼；手势结束时则直接收敛到合法范围。
 */
const constrainTranslation = (
  translationX: number,
  translationY: number,
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
  sourceWidth: number,
  sourceHeight: number,
  allowResistance: boolean,
) => {
  'worklet';

  const contained = getContainedImageSize(
    viewportWidth,
    viewportHeight,
    sourceWidth,
    sourceHeight,
  );
  const maxX = Math.max(0, (contained.width * scale - viewportWidth) / 2);
  const maxY = Math.max(0, (contained.height * scale - viewportHeight) / 2);

  return {
    x: allowResistance
      ? resistPastBounds(translationX, maxX)
      : clampValue(translationX, -maxX, maxX),
    y: allowResistance
      ? resistPastBounds(translationY, maxY)
      : clampValue(translationY, -maxY, maxY),
  };
};

export const ZoomImageModal = ({
  visible,
  uri,
  onRequestClose,
}: ZoomImageModalProps) => {
  const insets = useSafeAreaInsets();
  const viewportWidth = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const sourceWidth = useSharedValue(0);
  const sourceHeight = useSharedValue(0);
  const scale = useSharedValue(MIN_SCALE);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);

  // 手势的起始快照全部放在 UI 线程共享值中，避免连续触摸时往返 JS 线程。
  const interactionMode = useSharedValue(MODE_IDLE);
  const didMove = useSharedValue(0);
  const firstTapX = useSharedValue(0);
  const firstTapY = useSharedValue(0);
  const firstTapTime = useSharedValue(-1);
  const doubleTapDragStartX = useSharedValue(0);
  const doubleTapDragStartY = useSharedValue(0);
  const doubleTapDragStartScale = useSharedValue(MIN_SCALE);
  const doubleTapDragStartTranslationX = useSharedValue(0);
  const doubleTapDragStartTranslationY = useSharedValue(0);
  const doubleTapDragMoved = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const panStartTranslationX = useSharedValue(0);
  const panStartTranslationY = useSharedValue(0);
  const pinchStartDistance = useSharedValue(1);
  const pinchStartFocalX = useSharedValue(0);
  const pinchStartFocalY = useSharedValue(0);
  const pinchStartScale = useSharedValue(MIN_SCALE);
  const pinchStartTranslationX = useSharedValue(0);
  const pinchStartTranslationY = useSharedValue(0);

  // 单击关闭会等待双击判定窗口；token 用于让已过期的延迟回调失效。
  const closeDelayProgress = useSharedValue(0);
  const closeDelayToken = useSharedValue(0);
  const isSecondTap = useSharedValue(false);
  const clickTime = useSharedValue(0);

  const requestClose = useCallback(() => {
    onRequestClose();
  }, [onRequestClose]);

  // 任意后续触摸都会取消待执行的单击关闭，避免双击被错误地当成单击关闭。
  const cancelPendingTapClose = useCallback(() => {
    'worklet';
    closeDelayToken.value += 1;
    cancelAnimation(closeDelayProgress);
    closeDelayProgress.value = 0;
  }, [closeDelayProgress, closeDelayToken]);

  const resetTransform = useCallback(
    (animated: boolean) => {
      'worklet';
      // 完整复位到原始缩放与居中位置，可按调用场景选择是否显示回弹动画。
      cancelAnimation(scale);
      cancelAnimation(translationX);
      cancelAnimation(translationY);

      if (animated) {
        scale.value = withSpring(MIN_SCALE, SPRING_CONFIG);
        translationX.value = withSpring(0, SPRING_CONFIG);
        translationY.value = withSpring(0, SPRING_CONFIG);
        return;
      }

      scale.value = MIN_SCALE;
      translationX.value = 0;
      translationY.value = 0;
    },
    [scale, translationX, translationY],
  );

  const settleTransform = () => {
    'worklet';
    // 收手时修正缩放与平移，并以弹簧动画回到允许的范围内。
    const nextScale = clampValue(scale.value, MIN_SCALE, MAX_SCALE);
    const bounded = constrainTranslation(
      translationX.value,
      translationY.value,
      nextScale,
      viewportWidth.value,
      viewportHeight.value,
      sourceWidth.value,
      sourceHeight.value,
      false,
    );

    scale.value = withSpring(nextScale, SPRING_CONFIG);
    translationX.value = withSpring(bounded.x, SPRING_CONFIG);
    translationY.value = withSpring(bounded.y, SPRING_CONFIG);
  };

  const scheduleTapClose = () => {
    'worklet';
    // 延迟到双击窗口结束后再关闭；期间第二次触摸会通过 token 取消本次回调。
    const token = closeDelayToken.value + 1;
    closeDelayToken.value = token;
    cancelAnimation(closeDelayProgress);
    closeDelayProgress.value = 0;
    closeDelayProgress.value = withDelay(
      DOUBLE_TAP_DELAY,
      withTiming(1, { duration: 1 }, finished => {
        if (
          finished &&
          closeDelayToken.value === token &&
          scale.value <= MIN_SCALE + SCALE_EPSILON
        ) {
          runOnJS(requestClose)();
        }
      }),
    );
  };

  const startPinch = (
    firstX: number,
    firstY: number,
    secondX: number,
    secondY: number,
  ) => {
    'worklet';
    // 记录缩放开始时的双指距离、焦点和图片变换，后续以它们为基线计算增量。
    interactionMode.value = MODE_PINCH;
    didMove.value = 1;
    firstTapTime.value = -1;
    pinchStartDistance.value = Math.max(
      1,
      distanceBetween(firstX, firstY, secondX, secondY),
    );
    pinchStartFocalX.value = (firstX + secondX) / 2;
    pinchStartFocalY.value = (firstY + secondY) / 2;
    pinchStartScale.value = scale.value;
    pinchStartTranslationX.value = translationX.value;
    pinchStartTranslationY.value = translationY.value;
  };

  const toggleZoomAt = (anchorX: number, anchorY: number) => {
    'worklet';
    if (scale.value > MIN_SCALE + SCALE_EPSILON) {
      resetTransform(true);
      return;
    }

    // 以双击点为缩放锚点补偿平移，使该图像位置在放大后不发生跳动。
    const nextScale = DOUBLE_TAP_SCALE;
    const ratio = nextScale / scale.value;
    const nextTranslationX =
      (1 - ratio) * (anchorX - viewportWidth.value / 2) +
      ratio * translationX.value;
    const nextTranslationY =
      (1 - ratio) * (anchorY - viewportHeight.value / 2) +
      ratio * translationY.value;
    const bounded = constrainTranslation(
      nextTranslationX,
      nextTranslationY,
      nextScale,
      viewportWidth.value,
      viewportHeight.value,
      sourceWidth.value,
      sourceHeight.value,
      false,
    );

    scale.value = withSpring(nextScale, SPRING_CONFIG);
    translationX.value = withSpring(bounded.x, SPRING_CONFIG);
    translationY.value = withSpring(bounded.y, SPRING_CONFIG);
  };

  // 手动统一处理模拟器鼠标、单指/双指触摸，以及双击后按住拖动的组合手势。
  const imageGesture = Gesture.Manual()
    .onTouchesDown((event, stateManager) => {
      ('worklet');
      // 识别优先级：双指捏合 > 双击后纵向滑动缩放 > 普通单指拖动。
      // Android 模拟器的鼠标左键按下会作为单指触摸到达这里。
      const touches = event.allTouches;
      console.log('开始点击', touches);
      const shouldActivate = interactionMode.value === MODE_IDLE;
      cancelPendingTapClose();

      if (touches.length >= 2) {
        // 只有模拟出的多点触控才会进入双指缩放分支。
        const firstTouch = touches[0];
        const secondTouch = touches[1];
        if (!firstTouch || !secondTouch) {
          return;
        }
        startPinch(firstTouch.x, firstTouch.y, secondTouch.x, secondTouch.y);
        if (shouldActivate) {
          stateManager.activate();
        }
        return;
      }

      const touch = touches[0];
      if (!touch) {
        return;
      }
      // 在时间与位置阈值内再次按下，才将这次触摸视作双击的第二击。
      let double = isSecondTap.value;
      clickTime.value++;
      console.log("点击次数",clickTime.value);
      if (clickTime.value === 1) {
        setTimeout(() => {
          console.log("重置点击次数")
          clickTime.value = 0;
        }, DOUBLE_TAP_DELAY);
        firstTapTime.value = Date.now();
        firstTapX.value = touch.x;
        firstTapY.value = touch.y;
        console.log(firstTapTime.value, firstTapX.value, firstTapY.value);
      } else if (clickTime.value === 2) {
        let now = Date.now();
        isSecondTap.value =
          firstTapTime.value >= 0 &&
          now - firstTapTime.value <= DOUBLE_TAP_DELAY &&
          distanceBetween(touch.x, touch.y, firstTapX.value, firstTapY.value) <=
            DOUBLE_TAP_SLOP;
        console.log('是否是双击：', isSecondTap.value);
        console.log(
          firstTapTime.value >= 0,
          now - firstTapTime.value <= DOUBLE_TAP_DELAY,
          distanceBetween(touch.x, touch.y, firstTapX.value, firstTapY.value) <=
            DOUBLE_TAP_SLOP,
        );
        double = isSecondTap.value;
      }

      if (double) {
        // 第二击按住时，以第一次点击位置为锚点：上滑缩小，下滑放大。
        console.log('----单指纵向缩放----');
        interactionMode.value = MODE_VERTICAL_ZOOM;
        doubleTapDragStartX.value = touch.x;
        doubleTapDragStartY.value = touch.y;
        doubleTapDragStartScale.value = scale.value;
        doubleTapDragStartTranslationX.value = translationX.value;
        doubleTapDragStartTranslationY.value = translationY.value;
        doubleTapDragMoved.value = 0;
        firstTapTime.value = -1;
      } else {
        // 未命中双击时记录平移起点；原始尺寸下不会真正移动图片。
        // 普通鼠标按住拖动从这里开始；是否平移取决于当前缩放比例。
        console.log('----单指----');
        interactionMode.value = MODE_PAN;
        didMove.value = 0;
        panStartX.value = touch.x;
        panStartY.value = touch.y;
        panStartTranslationX.value = translationX.value;
        panStartTranslationY.value = translationY.value;
      }

      if (shouldActivate) {
        stateManager.activate();
      }
    })
    .onTouchesMove(event => {
      'worklet';
      console.log("点击移动中")
      const touches = event.allTouches;

      if (touches.length >= 2) {
        // 用“当前距离 / 起始距离”计算缩放，并按双指焦点补偿位移。
        // 模拟器开启多点触控后，两个触点的距离变化会驱动缩放。
        const firstTouch = touches[0];
        const secondTouch = touches[1];
        if (!firstTouch || !secondTouch) {
          return;
        }
        if (interactionMode.value !== MODE_PINCH) {
          startPinch(firstTouch.x, firstTouch.y, secondTouch.x, secondTouch.y);
          return;
        }

        const distance = Math.max(
          1,
          distanceBetween(
            firstTouch.x,
            firstTouch.y,
            secondTouch.x,
            secondTouch.y,
          ),
        );
        const nextScale = clampValue(
          pinchStartScale.value * (distance / pinchStartDistance.value),
          MIN_SCALE,
          MAX_SCALE,
        );
        const ratio = nextScale / pinchStartScale.value;
        const focalX = (firstTouch.x + secondTouch.x) / 2;
        const focalY = (firstTouch.y + secondTouch.y) / 2;
        const nextTranslationX =
          focalX -
          viewportWidth.value / 2 -
          ratio *
            (pinchStartFocalX.value -
              viewportWidth.value / 2 -
              pinchStartTranslationX.value);
        const nextTranslationY =
          focalY -
          viewportHeight.value / 2 -
          ratio *
            (pinchStartFocalY.value -
              viewportHeight.value / 2 -
              pinchStartTranslationY.value);
        const bounded = constrainTranslation(
          nextTranslationX,
          nextTranslationY,
          nextScale,
          viewportWidth.value,
          viewportHeight.value,
          sourceWidth.value,
          sourceHeight.value,
          true,
        );

        scale.value = nextScale;
        translationX.value = bounded.x;
        translationY.value = bounded.y;
        return;
      }

      const touch = touches[0];
      if (!touch) {
        return;
      }

      if (interactionMode.value === MODE_PINCH) {
        // 双指中的一根离开后，无缝接续为单指平移，避免图片突然跳动。
        interactionMode.value = MODE_PAN;
        panStartX.value = touch.x;
        panStartY.value = touch.y;
        panStartTranslationX.value = translationX.value;
        panStartTranslationY.value = translationY.value;
        didMove.value = 1;
        return;
      }

      if (interactionMode.value === MODE_VERTICAL_ZOOM) {
        // 以第二击的纵向位移控制缩放；屏幕坐标向下为正，因此下滑放大、上滑缩小。
        // 双击后的第二次按住拖动：以首次点击位置为锚点缩放。
        if (
          distanceBetween(
            touch.x,
            touch.y,
            doubleTapDragStartX.value,
            doubleTapDragStartY.value,
          ) > TAP_SLOP
        ) {
          doubleTapDragMoved.value = 1;
        }

        const verticalDelta = touch.y - doubleTapDragStartY.value;
        const nextScale = clampValue(
          doubleTapDragStartScale.value +
            verticalDelta / VERTICAL_ZOOM_DISTANCE,
          MIN_SCALE,
          MAX_SCALE,
        );
        const ratio = nextScale / doubleTapDragStartScale.value;
        const nextTranslationX =
          (1 - ratio) * (firstTapX.value - viewportWidth.value / 2) +
          ratio * doubleTapDragStartTranslationX.value;
        const nextTranslationY =
          (1 - ratio) * (firstTapY.value - viewportHeight.value / 2) +
          ratio * doubleTapDragStartTranslationY.value;
        const bounded = constrainTranslation(
          nextTranslationX,
          nextTranslationY,
          nextScale,
          viewportWidth.value,
          viewportHeight.value,
          sourceWidth.value,
          sourceHeight.value,
          false,
        );

        scale.value = nextScale;
        translationX.value = bounded.x;
        translationY.value = bounded.y;
        return;
      }

      const movement = distanceBetween(
        touch.x,
        touch.y,
        panStartX.value,
        panStartY.value,
      );
      if (movement > TAP_SLOP) {
        didMove.value = 1;
      }
      if (scale.value <= MIN_SCALE + SCALE_EPSILON) {
        // 原始大小不允许平移；松开时可能被识别为下拉关闭。
        return;
      }

      // 放大后的单指拖动允许少量越界阻尼，最终在收手时回弹。
      // 图片已放大时，单指（含模拟器鼠标左键）拖动会平移图片。
      const bounded = constrainTranslation(
        panStartTranslationX.value + touch.x - panStartX.value,
        panStartTranslationY.value + touch.y - panStartY.value,
        scale.value,
        viewportWidth.value,
        viewportHeight.value,
        sourceWidth.value,
        sourceHeight.value,
        true,
      );
      translationX.value = bounded.x;
      translationY.value = bounded.y;
    })
    .onTouchesUp((event, stateManager) => {
      ('worklet');
      console.log('点击完毕');
      const touches = event.allTouches;
      const doubleTapAnchorX = firstTapX.value;
      const doubleTapAnchorY = firstTapY.value;

      //重置
      let double = isSecondTap.value;
      if (double) {
        console.log('清理双击缩放第一次状态');
        firstTapTime.value = -1;
        isSecondTap.value = false;
      }
      if (touches.length > 0) {
        const remainingTouch = touches[0];
        if (remainingTouch && interactionMode.value === MODE_PINCH) {
          interactionMode.value = MODE_PAN;
          panStartX.value = remainingTouch.x;
          panStartY.value = remainingTouch.y;
          panStartTranslationX.value = translationX.value;
          panStartTranslationY.value = translationY.value;
          didMove.value = 1;
        }
        return;
      }

      const mode = interactionMode.value;
      // 收手时按当前模式决定：切换缩放、下拉关闭、回弹，或等待双击判定。
      if (mode === MODE_VERTICAL_ZOOM) {
        if (doubleTapDragMoved.value === 0) {
          toggleZoomAt(doubleTapAnchorX, doubleTapAnchorY);
        } else {
          settleTransform();
        }
        firstTapTime.value = -1;
      } else if (
        mode === MODE_PAN &&
        didMove.value !== 0 &&
        scale.value <= MIN_SCALE + SCALE_EPSILON
      ) {
        // 原始大小下，纵向拖动超过阈值会关闭弹窗，而不是移动图片。
        const liftedTouch = event.changedTouches[0];
        const deltaX = liftedTouch ? liftedTouch.x - panStartX.value : 0;
        const deltaY = liftedTouch ? liftedTouch.y - panStartY.value : 0;

        if (
          Math.abs(deltaY) >= DISMISS_DISTANCE &&
          Math.abs(deltaY) > Math.abs(deltaX)
        ) {
          firstTapTime.value = -1;
          interactionMode.value = MODE_IDLE;
          stateManager.end();
          runOnJS(requestClose)();
          return;
        }

        settleTransform();
        firstTapTime.value = -1;
      } else if (mode === MODE_PINCH || didMove.value !== 0) {
        settleTransform();
        firstTapTime.value = -1;
      } else {
        // 原始大小的单击会延迟关闭，给双击缩放留出判定时间。
        const liftedTouch = event.changedTouches[0];
        if (liftedTouch) {
          firstTapX.value = liftedTouch.x;
          firstTapY.value = liftedTouch.y;
          firstTapTime.value = Date.now();
        }
        if (scale.value <= MIN_SCALE + SCALE_EPSILON) {
          scheduleTapClose();
        }
      }

      if (double) {
        firstTapX.value = 0;
        firstTapY.value = 0;
      }
      interactionMode.value = MODE_IDLE;
      stateManager.end();
    })
    .onTouchesCancelled((_event, stateManager) => {
      'worklet';
      cancelPendingTapClose();
      settleTransform();
      firstTapTime.value = -1;
      interactionMode.value = MODE_IDLE;
      stateManager.end();
    });

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      { scale: scale.value },
    ],
  }));

  const onSurfaceLayout = useCallback(
    (event: LayoutChangeEvent) => {
      // 视口尺寸改变会影响平移边界，因此重新居中，避免沿用旧尺寸的位移。
      const { height, width } = event.nativeEvent.layout;
      if (viewportWidth.value === width && viewportHeight.value === height) {
        return;
      }
      viewportWidth.value = width;
      viewportHeight.value = height;
      resetTransform(false);
    },
    [resetTransform, viewportHeight, viewportWidth],
  );

  const onImageLoad = useCallback(
    (event: NativeSyntheticEvent<ImageLoadEventData>) => {
      // 图片固有尺寸决定 contain 后的边界；切换图片后必须从初始变换开始。
      const { height, width } = event.nativeEvent.source;
      if (sourceWidth.value === width && sourceHeight.value === height) {
        return;
      }
      sourceWidth.value = width;
      sourceHeight.value = height;
      resetTransform(false);
    },
    [resetTransform, sourceHeight, sourceWidth],
  );

  useEffect(() => {
    // 弹窗显示状态或图片地址变化时，清理未完成的单击关闭与上一张图片的手势状态。
    cancelPendingTapClose();
    firstTapTime.value = -1;
    sourceWidth.value = 0;
    sourceHeight.value = 0;
    resetTransform(false);
  }, [
    cancelPendingTapClose,
    firstTapTime,
    resetTransform,
    sourceHeight,
    sourceWidth,
    uri,
    visible,
  ]);

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      onRequestClose={requestClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.backdrop}>
          <GestureDetector gesture={imageGesture}>
            <View onLayout={onSurfaceLayout} style={styles.viewport}>
              {uri ? (
                <Animated.Image
                  onLoad={onImageLoad}
                  resizeMode="contain"
                  source={{ uri }}
                  style={[styles.image, imageAnimatedStyle]}
                />
              ) : null}
            </View>
          </GestureDetector>
          <Pressable
            accessibilityLabel="Close image preview"
            accessibilityRole="button"
            hitSlop={10}
            onPress={requestClose}
            style={[styles.closeButton, { top: Math.max(insets.top + 8, 16) }]}
          >
            <IconXCircle size={24} color="#fff" />
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  viewport: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.65)',
  }
});
