import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {
  removeStoAllUser,
  setStoUserData,
  type UserData,
} from '../storage/user.ts';
type UserState = {
  loggedIn: boolean;
  loginOutHref: string;
  user: UserData;
};

const initialState: UserState = {
  loggedIn: false,
  loginOutHref: '',
  user: {
    username: '',
    status: '',
    joinDate: '',
    group: '',
    email: '',
    location: '',
    interests: '',
    website: '',
    occupation: '',
    biography: '',
    diskUsage: '',
    filesUploaded: '',
    lastComment: '',
    lastUploadedFile: ''
  }
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLoginState(state, action: PayloadAction<string>) {
      state.loginOutHref = action.payload;
      state.loggedIn = Boolean(action.payload);
    },
    setUserData(state, action: PayloadAction<UserData>) {
      Object.assign(state.user, action.payload);
      const data = action.payload;
      const keys = Object.keys(data);
      keys.forEach(k => {
        setStoUserData(k as keyof UserData, action.payload[k as keyof UserData] || '');
      });
    },
    setOneOfUserData(state, action: PayloadAction<{ key: keyof UserData; value: string }>) {
      state.user[action.payload.key] = action.payload.value;
      setStoUserData(action.payload.key, action.payload.value);
    },
    clearUserData(state) {
      state.user = {
        username: '',
        status: '',
        joinDate: '',
        group: '',
        email: '',
        location: '',
        interests: '',
        website: '',
        occupation: '',
        biography: '',
        diskUsage: '',
        filesUploaded: '',
        lastComment: '',
        lastUploadedFile: '',
      };
      removeStoAllUser();
    },
  },
});

export const userActions = userSlice.actions;
export const userReducer = userSlice.reducer;
