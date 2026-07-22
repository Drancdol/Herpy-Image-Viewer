/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import {queryClient} from '../src/query/client';

jest.mock('../src/apis/gallery', () => ({
  apiMainPage: jest.fn(() => Promise.resolve({statusCode: 200, data: ''})),
  apiClassificationSwitchPage: jest.fn(() =>
    Promise.resolve({statusCode: 200, data: ''}),
  ),
  apiGetImageDetail: jest.fn(() => Promise.resolve({statusCode: 200, data: ''})),
  apiGetSingleImgUrl: jest.fn(() =>
    Promise.resolve({statusCode: 200, data: ''}),
  ),
  apiSearch: jest.fn(() => Promise.resolve({statusCode: 200, data: ''})),
}));

test('renders correctly', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  await ReactTestRenderer.act(async () => {
    renderer?.unmount();
  });
  queryClient.clear();
});
