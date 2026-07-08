import {configureStore, createListenerMiddleware} from '@reduxjs/toolkit';
import {appActions, appReducer} from './appSlice';
import {saveStoredSetting, saveStoredTheme} from '../storage/setting';

const listenerMiddleware = createListenerMiddleware();
//设置三项更新中间件 存储设置
listenerMiddleware.startListening({
  actionCreator: appActions.updateSetting,
  effect: action => {
    saveStoredSetting(action.payload.key, action.payload.value);
  },
});
//存储主题设置
listenerMiddleware.startListening({
  actionCreator: appActions.setTheme,
  effect: action => {
    saveStoredTheme(action.payload);
  },
});

export const store = configureStore({
  reducer: {
    app: appReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export {appActions, createSearchConfig} from './appSlice';
