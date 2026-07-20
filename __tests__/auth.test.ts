import {
  apiLogout,
  getLoginOutHref,
  hasLoggedInAccount,
  isLogoutSuccessful,
} from '../src/apis/auth';
import {request} from '../src/apis/request';

jest.mock('../src/apis/request', () => ({
  request: jest.fn(),
}));

const accountHomepageHtml = `
  <td style="background-image:url(themes/rainy_day/images/button1_r1_c2.gif)">
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
  expect(getLoginOutHref(accountHomepageHtml)).toBe(
    'logout.php?form_token=eef1417e50b3806ef91459a88fe441e1&timestamp=1784530481',
  );
});

test.each([
  '<a href="logout.php?token=abc">Logout</a>',
  '<a href="login.php">Logout [Drancdol]</a>',
  '<a href="logout.php?token=abc">Logout []</a>',
  '<a href="logout.php?token=abc">Welcome [Drancdol]</a>',
])('does not mistake a non-account link for a login: %s', html => {
  expect(hasLoggedInAccount(html)).toBe(false);
  expect(getLoginOutHref(html)).toBe('');
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
