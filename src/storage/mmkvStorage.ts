import {createMMKV} from 'react-native-mmkv';

export const storage = createMMKV({
  id: 'hia-viewer-app',
  compareBeforeSet: true,
});