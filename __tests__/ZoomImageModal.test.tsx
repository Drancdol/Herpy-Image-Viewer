import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { ZoomImageModal } from '../src/component/ZoomImageModal';

jest.mock('../src/assets/icon/Xcircle.tsx', () => ({
  IconXCircle: () => null,
}));

type Touch = {
  id: number;
  x: number;
  y: number;
  absoluteX: number;
  absoluteY: number;
};

type TouchUpHandler = (
  event: {
    allTouches: Touch[];
    changedTouches: Touch[];
    numberOfTouches: number;
  },
  stateManager: { end: jest.Mock },
) => void;

test('renders a visible preview and closes from its close button', () => {
  const onRequestClose = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <ZoomImageModal
        onRequestClose={onRequestClose}
        uri="https://example.com/image.jpg"
        visible
      />,
    );
  });

  const closeButton = renderer?.root.findByProps({
    accessibilityLabel: 'Close image preview',
  });
  closeButton?.props.onPress();

  expect(onRequestClose).toHaveBeenCalledTimes(1);

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
});

test('settles an out-of-bounds translation after the final touch is lifted', () => {
  let onTouchesUp: TouchUpHandler | undefined;
  const manualGesture = {
    onTouchesDown: (_callback: unknown) => manualGesture,
    onTouchesMove: (_callback: unknown) => manualGesture,
    onTouchesUp: (callback: TouchUpHandler) => {
      onTouchesUp = callback;
      return manualGesture;
    },
    onTouchesCancelled: (_callback: unknown) => manualGesture,
  };
  const manualSpy = jest
    .spyOn(Gesture, 'Manual')
    .mockImplementation(() => manualGesture as never);
  const sharedValueMock = useSharedValue as unknown as jest.Mock;
  sharedValueMock.mockClear();

  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  try {
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ZoomImageModal
          onRequestClose={jest.fn()}
          uri="https://example.com/image.jpg"
          visible
        />,
      );
    });

    const sharedValues = sharedValueMock.mock.results.map(
      result => result.value as { value: number },
    );
    sharedValues[0]!.value = 300;
    sharedValues[1]!.value = 300;
    sharedValues[2]!.value = 300;
    sharedValues[3]!.value = 300;
    sharedValues[4]!.value = 2;
    sharedValues[5]!.value = 200;
    sharedValues[6]!.value = 0;
    sharedValues[7]!.value = 1;
    sharedValues[8]!.value = 1;

    const liftedTouch: Touch = {
      id: 1,
      x: 0,
      y: 0,
      absoluteX: 0,
      absoluteY: 0,
    };
    const stateManager = { end: jest.fn() };

    ReactTestRenderer.act(() => {
      onTouchesUp!(
        {
          allTouches: [liftedTouch],
          changedTouches: [liftedTouch],
          numberOfTouches: 0,
        },
        stateManager,
      );
    });

    expect(sharedValues[5]!.value).toBe(150);
    expect(stateManager.end).toHaveBeenCalledTimes(1);
  } finally {
    ReactTestRenderer.act(() => {
      renderer?.unmount();
    });
    manualSpy.mockRestore();
  }
});
