import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {hasAuthorizationCookies} from '../storage/authorization';

type UserState = {
  loggedIn: boolean;
};

const initialState: UserState = {
  loggedIn: hasAuthorizationCookies(),
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLoggedIn(state, action: PayloadAction<boolean>) {
      state.loggedIn = action.payload;
    },
  },
});

export const userActions = userSlice.actions;
export const userReducer = userSlice.reducer;
