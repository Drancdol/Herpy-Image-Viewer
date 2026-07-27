import {userActions, userReducer} from '../src/store/user';

test('keeps login state and logout href in sync', () => {
  const loggedInState = userReducer(
    undefined,
    userActions.setLoginState('logout.php?form_token=token&timestamp=123'),
  );

  expect(loggedInState).toMatchObject({
    loggedIn: true,
    loginOutHref: 'logout.php?form_token=token&timestamp=123',
  });

  expect(userReducer(loggedInState, userActions.setLoginState(''))).toMatchObject({
    loggedIn: false,
    loginOutHref: '',
  });
});
