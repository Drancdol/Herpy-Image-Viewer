import {
  isUserProfileLoginRequired,
  parseUserProfile,
} from '../src/tools/process';

const profileHtml = `
  <form id="cpgform">
    <table>
      <tr><td>Username:</td><td>Alice &amp; Co</td></tr>
      <tr><td>Status:</td><td>Active</td></tr>
      <tr><td>Joined:</td><td>January 2, 2024</td></tr>
      <tr><td>Group:</td><td>Members</td></tr>
      <tr><td>Email:</td><td>alice@example.com</td></tr>
      <tr><td>Disk usage:</td><td>12 MB</td></tr>
      <tr><td>Files uploaded:</td><td>42</td></tr>
      <tr><td>Last comment:</td><td>Nice image</td></tr>
      <tr><td>Last uploaded file:</td><td>sunset.jpg</td></tr>
    </table>
    <input name="user_profile1" value="Shanghai &amp; Pudong" />
    <input name="user_profile2" value="Photography" />
    <input name="user_profile3" value="https://example.com" />
    <input name="user_profile4" value="Designer" />
    <textarea name="user_profile6">Enjoys &amp; makes things.</textarea>
  </form>
`;

test('parses the profile form and normalizes HTML entities', () => {
  expect(parseUserProfile(profileHtml)).toEqual({
    username: 'Alice & Co',
    status: 'Active',
    joinDate: 'January 2, 2024',
    group: 'Members',
    email: 'alice@example.com',
    location: 'Shanghai & Pudong',
    interests: 'Photography',
    website: 'https://example.com',
    occupation: 'Designer',
    biography: 'Enjoys & makes things.',
    diskUsage: '12 MB',
    filesUploaded: '42',
    lastComment: 'Nice image',
    lastUploadedFile: 'sunset.jpg',
  });
});

test('recognizes the server warning shown to signed-out users', () => {
  expect(
    isUserProfileLoginRequired(`
      <div class="cpg_message_warning">
        You don't have permission to access this page.
      </div>
    `),
  ).toBe(true);
  expect(isUserProfileLoginRequired('<form id="cpgform"></form>')).toBe(false);
  expect(parseUserProfile('<html></html>')).toBeNull();
});
