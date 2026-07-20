export type {ApiResponse} from './request';
export type {LoginResult} from './auth';
export type {FavoriteAction} from './fav';
export {apiLogin} from './auth';
export {apiAddFav, parseFavoriteAction} from './fav';
export {
  apiClassificationPage,
  apiClassificationSwitchPage,
  apiFavoriteGalleryPage,
  apiGetImageDetail,
  apiGetSingleImgUrl,
  apiMainPage,
  apiSearch,
} from './gallery';
