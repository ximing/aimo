import { and, eq, inArray } from 'drizzle-orm';
import { MySqlDialect } from 'drizzle-orm/mysql-core';

import { attachments } from '../db/schema/attachments.js';

const dialect = new MySqlDialect();

function compileAttachmentIdFilter(attachmentIds: string[], uid: string) {
  const condition = and(
    inArray(attachments.attachmentId, attachmentIds),
    eq(attachments.uid, uid),
    eq(attachments.deletedAt, 0)
  );
  if (!condition) {
    throw new Error('expected SQL condition');
  }
  return dialect.sqlToQuery(condition.getSQL());
}

describe('attachment id query binding', () => {
  const validId = 'f0123456789abcdefghijklm';
  const maliciousId = "f' OR 1=1 --";
  const uid = 'u0123456789abcdefghijklm';

  it('puts a legitimate attachment id in bound parameters', () => {
    const query = compileAttachmentIdFilter([validId], uid);

    expect(validId).toMatch(/^f[a-z0-9]{23}$/);
    expect(query.params).toContain(validId);
    expect(query.params).toContain(uid);
    expect(query.params).toContain(0);
    expect(query.sql).not.toContain(`'${validId}'`);
    expect(query.sql).toContain('?');
  });

  it('keeps a malicious attachment id out of the SQL text', () => {
    const query = compileAttachmentIdFilter([validId, maliciousId], uid);

    expect(query.sql).not.toContain(maliciousId);
    expect(query.sql).not.toContain('OR 1=1');
    expect(query.params).toContain(maliciousId);
    expect(query.params).toContain(validId);
    expect(query.params.filter((param) => param === maliciousId)).toEqual([maliciousId]);
  });
});
