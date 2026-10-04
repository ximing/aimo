import { createHash } from 'node:crypto';

import {
  huaweiClickIntent,
  huaweiMessageBody,
  sendHuaweiPush,
  setHuaweiTransport,
  type HuaweiTransport,
} from '../services/huawei-push.js';
import { pushTokenKey } from '../services/push-device.service.js';

jest.mock('../config/config.js', () => ({
  config: {
    huawei: {
      clientId: '',
      clientSecret: '',
      packageName: 'com.delu.aimo',
      scheme: 'aimoapp',
    },
  },
}));

const MEMO = 'mabc123memo';

afterEach(() => {
  setHuaweiTransport(undefined);
});

describe('huawei push', () => {
  const app = { packageName: 'com.delu.aimo', scheme: 'aimoapp' };

  it('opens the app on the memo when the notification is tapped', () => {
    const intent = huaweiClickIntent({ kind: 'memo', id: MEMO }, app);
    expect(intent).toContain('scheme=aimoapp');
    expect(intent).toContain('package=com.delu.aimo');
    expect(intent).toContain(`memo/${MEMO}`);
    expect(intent.endsWith(';end')).toBe(true);

    const body = huaweiMessageBody('复习提醒', '写周报', { kind: 'memo', id: MEMO }, 'tok', app);
    const message = body.message as {
      android: {
        category: string;
        notification: { click_action: { type: number; intent: string } };
      };
    };
    expect(message.android.category).toBe('WORK');
    expect(message.android.notification.click_action.type).toBe(1);
    expect(message.android.notification.click_action.intent).toBe(intent);
  });

  it('falls back to home when the memo id is not a safe path segment', () => {
    const intent = huaweiClickIntent({ kind: 'memo', id: '../etc' }, app);
    expect(intent).toContain('intent://home#');
  });

  it('treats an invalid device token as permanent', async () => {
    setHuaweiTransport({
      postForm: () =>
        Promise.resolve({ httpStatus: 200, json: { access_token: 't', expires_in: 3600 } }),
      postJson: () =>
        Promise.resolve({
          httpStatus: 200,
          json: { code: '80300007', msg: 'All the tokens are invalid' },
        }),
    });
    const result = await sendHuaweiPush({
      token: 'gone',
      title: '复习提醒',
      body: '写周报',
      target: { kind: 'review' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.permanent).toBe(true);
      expect(result.invalidToken).toBe(true);
    }
  });

  it('reuses the oauth token until it expires', async () => {
    let formCalls = 0;
    const transport: HuaweiTransport = {
      postForm: () => {
        formCalls += 1;
        return Promise.resolve({ httpStatus: 200, json: { access_token: 't', expires_in: 3600 } });
      },
      postJson: () =>
        Promise.resolve({ httpStatus: 200, json: { code: '80000000', msg: 'Success' } }),
    };
    setHuaweiTransport(transport);
    const first = await sendHuaweiPush({
      token: 'tok',
      title: '今日推荐',
      body: '一条备忘',
      target: { kind: 'home' },
    });
    const second = await sendHuaweiPush({
      token: 'tok',
      title: '今日推荐',
      body: '一条备忘',
      target: { kind: 'home' },
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(formCalls).toBe(1);
  });

  it('reports an auth failure without marking the token invalid', async () => {
    setHuaweiTransport({
      postForm: () => Promise.resolve({ httpStatus: 401, json: {} }),
      postJson: () => Promise.resolve({ httpStatus: 200, json: { code: '80000000' } }),
    });
    const result = await sendHuaweiPush({
      token: 'tok',
      title: '今日推荐',
      body: '一条备忘',
      target: { kind: 'home' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.invalidToken).toBe(false);
      expect(result.permanent).toBe(false);
      expect(result.error).toBe('华为推送网络错误');
    }
  });
});

describe('push token key', () => {
  it('is a stable sha256 of provider and token', () => {
    const key = pushTokenKey('huawei', 'device-token');
    const expected = createHash('sha256').update('huawei\0device-token').digest('hex');
    expect(key).toBe(expected);
    expect(key).toHaveLength(64);
  });
});
