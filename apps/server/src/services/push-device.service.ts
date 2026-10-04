import { createHash } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { Service } from 'typedi';

import { getDatabase } from '../db/connection.js';
import { pushDevices } from '../db/schema/push-devices.js';
import { OBJECT_TYPE } from '../models/constant/type.js';
import { generateTypeId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import { huaweiPushConfigured, sendHuaweiPush, type HuaweiPushTarget } from './huawei-push.js';

import type { PushProvider } from '@aimo/dto';

export function pushTokenKey(provider: string, token: string): string {
  return createHash('sha256').update(`${provider}\0${token}`).digest('hex');
}

function isDuplicate(error: unknown): boolean {
  const failure = error as {
    code?: string;
    errno?: number;
    cause?: { code?: string; errno?: number };
  };
  return (
    failure?.code === 'ER_DUP_ENTRY' ||
    failure?.errno === 1062 ||
    failure?.cause?.code === 'ER_DUP_ENTRY' ||
    failure?.cause?.errno === 1062
  );
}

export type HuaweiDeliveryResult =
  | { skipped: true; reason: 'unconfigured' | 'no-devices' }
  | { skipped: false; sent: number; failed: number; error?: string };

@Service()
export class PushDeviceService {
  async register(
    uid: string,
    provider: PushProvider,
    token: string
  ): Promise<{ id: string; provider: PushProvider }> {
    const database = getDatabase();
    const tokenKey = pushTokenKey(provider, token);
    const now = new Date();
    const existing = await database
      .select()
      .from(pushDevices)
      .where(eq(pushDevices.tokenKey, tokenKey))
      .limit(1);
    const found = existing[0];
    if (found) {
      await database
        .update(pushDevices)
        .set({ uid, token, provider, updatedAt: now })
        .where(eq(pushDevices.id, found.id));
      return { id: found.id, provider };
    }

    const id = generateTypeId(OBJECT_TYPE.PUSH_DEVICE);
    try {
      await database.insert(pushDevices).values({
        id,
        uid,
        provider,
        token,
        tokenKey,
        createdAt: now,
        updatedAt: now,
      });
      return { id, provider };
    } catch (error) {
      if (!isDuplicate(error)) throw error;
      const raced = await database
        .select()
        .from(pushDevices)
        .where(eq(pushDevices.tokenKey, tokenKey))
        .limit(1);
      const row = raced[0];
      if (!row) throw error;
      await database
        .update(pushDevices)
        .set({ uid, token, provider, updatedAt: now })
        .where(eq(pushDevices.id, row.id));
      return { id: row.id, provider };
    }
  }

  /**
   * Send one notification to every Huawei device registered to this user.
   * Missing credentials or devices skip quietly. An invalid token is removed.
   */
  async deliver(
    uid: string,
    input: { title: string; body: string; target: HuaweiPushTarget }
  ): Promise<HuaweiDeliveryResult> {
    if (!huaweiPushConfigured()) {
      return { skipped: true, reason: 'unconfigured' };
    }
    const database = getDatabase();
    const devices = await database
      .select()
      .from(pushDevices)
      .where(and(eq(pushDevices.uid, uid), eq(pushDevices.provider, 'huawei')));
    if (devices.length === 0) {
      return { skipped: true, reason: 'no-devices' };
    }

    let sent = 0;
    let failed = 0;
    let error: string | undefined;
    for (const device of devices) {
      const result = await sendHuaweiPush({
        token: device.token,
        title: input.title,
        body: input.body,
        target: input.target,
      });
      if (result.ok) {
        sent += 1;
        continue;
      }
      failed += 1;
      error = result.error;
      logger.warn('huawei.push.device_fail', {
        uid,
        deviceId: device.id,
        permanent: result.permanent,
        invalidToken: result.invalidToken,
      });
      if (result.invalidToken) {
        await database.delete(pushDevices).where(eq(pushDevices.id, device.id));
      }
    }
    return { skipped: false, sent, failed, error };
  }
}
