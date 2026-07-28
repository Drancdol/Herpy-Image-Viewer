import {
  apiLogout,
  apiUpdateUserPassword,
  apiUpdateUserProfile,
  getLoginOutHref,
  hasLoggedInAccount,
  isLogoutSuccessful,
} from '../src/apis/auth';
import {request} from '../src/apis/request';

jest.mock('../src/apis/request', () => ({
  request: jest.fn(),
}));

const accountHomepageHtml = `
  <td>
    <a href="logout.php?form_token=eef1417e50b3806ef91459a88fe441e1&amp;timestamp=1784530481&amp;referer=thumbnails.php%3Falbum%3Dfavpics" title="Log me out">Logout [Drancdol]</a>
  </td>
`;

const logoutSuccessHtml = `
  <div id="cpgMessage" class="cpg_user_message cpg_message_info">
    Bye bye Drancdol ...
  </div>
`;

beforeEach(() => {
  jest.clearAllMocks();
});

test('recognizes an account logout link on the homepage', () => {
  expect(hasLoggedInAccount(accountHomepageHtml)).toBe(true);
  expect(getLoginOutHref(accountHomepageHtml)).toEqual({
    href: 'logout.php?form_token=eef1417e50b3806ef91459a88fe441e1&timestamp=1784530481',
    userName: 'Drancdol',
  });
});

test.each([
  '<a href="logout.php?token=abc">Logout</a>',
  '<a href="login.php">Logout [Drancdol]</a>',
  '<a href="logout.php?token=abc">Logout []</a>',
  '<a href="logout.php?token=abc">Welcome [Drancdol]</a>',
])('does not mistake a non-account link for a login: %s', html => {
  expect(hasLoggedInAccount(html)).toBe(false);
  expect(getLoginOutHref(html)).toEqual({href: '', userName: ''});
});

test('recognizes the server logout confirmation message', () => {
  expect(isLogoutSuccessful(logoutSuccessHtml)).toBe(true);
  expect(
    isLogoutSuccessful(
      '<div id="cpgMessage" class="cpg_user_message">Bye bye Drancdol ...</div>',
    ),
  ).toBe(false);
});

test('only reports a logout request as successful after confirmation', async () => {
  const requestMock = request as jest.MockedFunction<typeof request>;
  requestMock.mockResolvedValue({
    statusCode: 200,
    data: logoutSuccessHtml,
  });

  await expect(
    apiLogout('logout.php?form_token=token&timestamp=123'),
  ).resolves.toMatchObject({success: true});
  expect(requestMock).toHaveBeenCalledWith(
    'logout.php?form_token=token&timestamp=123',
    expect.objectContaining({persistAuthorizationCookies: false}),
  );
});

test('submits profile fields with the tokens from the logout link', async () => {
  const requestMock = request as jest.MockedFunction<typeof request>;
  requestMock.mockResolvedValue({
    statusCode: 200,
    data: '<span class="cpg_user_message">Your profile was updated</span>',
  });

  const result = await apiUpdateUserProfile(
    {
      location: 'Shanghai',
      interests: 'Photography',
      website: 'https://example.com',
      occupation: 'Designer',
      biography: 'Hello',
    },
    'logout.php?form_token=token-value&timestamp=1785225806&referer=profile.php',
  );

  expect(result).toMatchObject({
    success: true,
    message: 'Your profile was updated',
  });
  expect(requestMock).toHaveBeenCalledWith(
    'profile.php',
    expect.objectContaining({
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    }),
  );

  const options = requestMock.mock.calls[0]?.[1];
  expect(options?.data).toBeInstanceOf(URLSearchParams);
  expect(Object.fromEntries((options?.data as URLSearchParams).entries())).toEqual({
    form_token: 'token-value',
    timestamp: '1785225806',
    user_profile1: 'Shanghai',
    user_profile2: 'Photography',
    user_profile3: 'https://example.com',
    user_profile4: 'Designer',
    user_profile6: 'Hello',
    change_profile: 'Apply changes',
  });
});

test('submits the current and repeated new password with the logout tokens', async () => {
  const requestMock = request as jest.MockedFunction<typeof request>;
  requestMock.mockResolvedValue({
    statusCode: 200,
    data: `
      <div id="cpgMessage" class="cpg_user_message cpg_message_success">
        Your password was changed
      </div>
    `,
  });

  await expect(
    apiUpdateUserPassword(
      'old-password',
      'new-password',
      'logout.php?form_token=token-value&timestamp=1785225761',
    ),
  ).resolves.toMatchObject({
    success: true,
    message: 'Your password was changed',
  });

  const options = requestMock.mock.calls[0]?.[1];
  expect(Object.fromEntries((options?.data as URLSearchParams).entries())).toEqual({
    form_token: 'token-value',
    timestamp: '1785225761',
    current_pass: 'old-password',
    new_pass: 'new-password',
    new_pass_again: 'new-password',
    change_password: 'Change my password',
  });
});

test('does not treat an unconfirmed profile response as successful', async () => {
  const requestMock = request as jest.MockedFunction<typeof request>;
  requestMock.mockResolvedValue({statusCode: 200, data: '<html />'});

  await expect(
    apiUpdateUserProfile(
      {
        location: '',
        interests: '',
        website: '',
        occupation: '',
        biography: '',
      },
      'logout.php?form_token=token-value&timestamp=1785225806',
    ),
  ).resolves.toMatchObject({success: false});
});

test('does not submit profile changes without valid logout tokens', async () => {
  const requestMock = request as jest.MockedFunction<typeof request>;

  await expect(
    apiUpdateUserProfile(
      {
        location: '',
        interests: '',
        website: '',
        occupation: '',
        biography: '',
      },
      'logout.php?form_token=token-value',
    ),
  ).rejects.toThrow('Login credentials have expired');

  expect(requestMock).not.toHaveBeenCalled();
});
