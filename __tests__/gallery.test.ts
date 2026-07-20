import {apiFavoriteGalleryPage} from '../src/apis/gallery';
import {request} from '../src/apis/request';

jest.mock('../src/apis/request', () => ({
  normalizePath: jest.fn(href => href),
  request: jest.fn(),
}));

test('requests the favorites gallery with its page number', () => {
  apiFavoriteGalleryPage(3);

  expect(request).toHaveBeenCalledWith(
    'thumbnails.php?album=favpics&page=3',
    expect.objectContaining({site: expect.any(Object)}),
  );
});
