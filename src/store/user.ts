import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
type UserState = {
  loggedIn: boolean;
  loginOutHref: string;
};

const initialState: UserState = {
  loggedIn: false,
  loginOutHref: '',
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLoginState(state, action: PayloadAction<string>) {
      state.loginOutHref = action.payload;
      state.loggedIn = Boolean(action.payload);
    },
  },
});

export const userActions = userSlice.actions;
export const userReducer = userSlice.reducer;
