import {storage} from './mmkvStorage.ts';

export enum UserDataKey {
  Username = 'username',
  Status = 'status',
  JoinDate = 'joinDate',
  Group = 'group',
  Email = 'email',
  Location = 'location',
  Interests = 'interests',
  Website = 'website',
  Occupation = 'occupation',
  Biography = 'biography',
  DiskUsage = 'diskUsage',
  FilesUploaded = 'filesUploaded',
  LastComment = 'lastComment',
  LastUploadedFile = 'lastUploadedFile',
}

// 手动定义每个字段的类型映射
export type UserDataFieldTypes = {
  [UserDataKey.Username]: string;
  [UserDataKey.Status]: string;
  [UserDataKey.JoinDate]: string;
  [UserDataKey.Group]: string;
  [UserDataKey.Email]: string;
  [UserDataKey.Location]: string;
  [UserDataKey.Interests]: string;
  [UserDataKey.Website]: string;
  [UserDataKey.Occupation]: string;
  [UserDataKey.Biography]: string;
  [UserDataKey.DiskUsage]: string;
  [UserDataKey.FilesUploaded]: string;
  [UserDataKey.LastComment]: string;
  [UserDataKey.LastUploadedFile]: string;
};

// 派生出 UserData
export type UserData = {
  [K in UserDataKey]: UserDataFieldTypes[K];
};

const UserStoKeys: Record<keyof UserData, string> = {
  username: 'user.username',
  status: 'user.status',
  joinDate: 'user.joinDate',
  group: 'user.group',
  email: 'user.email',
  location: 'user.location',
  interests: 'user.interests',
  website: 'user.Website',
  occupation: 'user.occupation',
  biography: 'user.biography',
  diskUsage: 'user.diskUsage',
  filesUploaded: 'user.filesUploaded',
  lastComment: 'user.lastComment',
  lastUploadedFile: 'user.lastUploadedFile',
};
export const loadUserData = (): UserData => {
  const userData: UserData = {
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
    filesUploaded: '0',
    lastComment: '',
    lastUploadedFile: '',
  };
  const keyList = Object.keys(UserStoKeys)
  for (const key of keyList) {
    let stoKey = UserStoKeys[key as keyof UserData];
    userData[key as keyof UserData] = storage.getString(stoKey) || '';
  }
  return userData;
};

export const setStoUserData = (key: keyof UserData, value: string): void => {
  const stoKey = UserStoKeys[key];
  if (stoKey) {
    storage.set(stoKey, value);
  }
};
export const removeStoUserData = (key: keyof UserData): boolean => {
  const stoKey = UserStoKeys[key];
  if (stoKey) {
    return storage.remove(stoKey);
  } else {
    return false;
  }
};
export const removeStoAllUser = () => {
  const keyList = Object.keys(UserStoKeys);
  keyList.forEach(key => {
    let stoKey: string = UserStoKeys[key as keyof UserData];
    storage.remove(stoKey);
  });
};