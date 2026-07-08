import {createMMKV} from 'react-native-mmkv';

export const storage = createMMKV({
  id: 'herpy-viewer-app',
  compareBeforeSet: true,
});