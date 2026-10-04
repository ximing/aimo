jest.mock('../config/config.js', () => ({
  config: {
    github: {
      apkRepo: 'ximing/aimo-app',
      token: '',
      androidMinVersionCode: undefined,
    },
  },
}));

import { selectAndroidRelease, setGitHubReleaseFetchForTest } from '../services/github-release.service.js';

const apk = {
  name: 'app-release.apk',
  browser_download_url: 'https://github.com/ximing/aimo-app/releases/download/v1.4.4/app-release.apk',
  size: 12,
};

afterEach(() => {
  setGitHubReleaseFetchForTest(undefined);
});

describe('selectAndroidRelease', () => {
  it('uses the latest release when it has an apk', () => {
    const release = selectAndroidRelease(
      {
        status: 200,
        body: { tag_name: 'v1.4.4', draft: false, assets: [apk], body: 'notes' },
      },
      null
    );
    expect(release?.versionCode).toBe(10404);
    expect(release?.apkUrl).toContain('app-release.apk');
    expect(release?.minVersionCode).toBeUndefined();
  });

  it('skips a latest build-number tag and uses an older semver release', () => {
    const release = selectAndroidRelease(
      { status: 200, body: { tag_name: 'v1.4.3-99', assets: [apk] } },
      {
        status: 200,
        body: [
          { tag_name: 'v1.4.3-99', assets: [apk] },
          { tag_name: 'v1.4.3', assets: [apk], body: 'stable' },
        ],
      }
    );
    expect(release?.versionName).toBe('1.4.3');
    expect(release?.releaseNotes).toBe('stable');
  });

  it('attaches minVersionCode only when it does not exceed the release', () => {
    const latest = {
      status: 200,
      body: { tag_name: 'v1.4.4', assets: [apk] },
    };
    expect(selectAndroidRelease(latest, null, 10400)?.minVersionCode).toBe(10400);
    expect(selectAndroidRelease(latest, null, 10405)?.minVersionCode).toBeUndefined();
  });

  it('returns null when nothing matches', () => {
    expect(selectAndroidRelease({ status: 404, body: null }, { status: 200, body: [] })).toBeNull();
  });
});
