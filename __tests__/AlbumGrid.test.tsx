import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AlbumGrid } from '../src/component/AlbumGrid';
import { ThumbnailImage } from '../src/component/ThumbnailImage';
import { THEMES } from '../src/tools/theme';
import type { GalleryImage } from '../src/tools/types';

jest.mock('../src/component/ThumbnailImage', () => {
  const mockReact = require('react');

  return {
    ThumbnailImage: ({ src }: { src?: string }) =>
      mockReact.createElement('ThumbnailImage', { src }),
  };
});

const images: GalleryImage[] = Array.from({ length: 6 }, (_, index) => ({
  href: `/image/${index}`,
  album: `/thumbnail/${index}`,
  name: `Image ${index}`,
  width: 100,
  height: 120,
}));

test('mounts non-comic thumbnails in source order', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <AlbumGrid
        list={images}
        comicMode={false}
        colors={THEMES.light}
        onOpen={jest.fn()}
      />,
    );
  });

  const thumbnails = renderer!.root.findAllByType(ThumbnailImage);

  expect(thumbnails.map(thumbnail => thumbnail.props.src)).toEqual(
    images.map(image => image.album),
  );

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
});
