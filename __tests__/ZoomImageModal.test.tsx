import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {ZoomImageModal} from '../src/component/ZoomImageModal';

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
