import os from 'node:os';
import path from 'node:path';

import { safeFileExtension } from '../utils/file-extension.js';
import { resolveInsideBase } from '../utils/storage-path.js';

describe('safeFileExtension', () => {
  it('keeps png, PNG, tar.gz, and a short extensionless name', () => {
    expect(safeFileExtension('photo.png')).toBe('png');
    expect(safeFileExtension('photo.PNG')).toBe('PNG');
    expect(safeFileExtension('archive.tar.gz')).toBe('gz');
    expect(safeFileExtension('readme')).toBe('readme');
    expect(safeFileExtension('photo.jpeg')).toBe('jpeg');
  });

  it('uses the fallback when the suffix contains a path or symbols', () => {
    for (const filename of ['../../etc/passwd', 'foo.txt/../../x']) {
      const extension = safeFileExtension(filename);
      expect(extension).toBe('bin');
      expect(extension).not.toContain('/');
      expect(extension).not.toContain('..');
    }

    expect(safeFileExtension('photo.', 'png')).toBe('png');
    expect(safeFileExtension('../../etc/passwd', 'png')).toBe('png');
  });
});

describe('resolveInsideBase', () => {
  const base = path.join(os.tmpdir(), 'aimo-storage-path-test');

  it('keeps a normal key under the base', () => {
    const target = resolveInsideBase(base, 'u1/2026-11-13/abc.png');
    const relative = path.relative(path.resolve(base), target);

    expect(relative).toBe(path.join('u1', '2026-11-13', 'abc.png'));
    expect(relative === '' || relative.startsWith('..') || path.isAbsolute(relative)).toBe(false);
    expect(target.startsWith(path.resolve(base) + path.sep)).toBe(true);
  });

  it('rejects a key that climbs with ..', () => {
    expect(() => resolveInsideBase(base, 'u1/2026-11-13/../../outside')).toThrow(
      'Storage key escapes base path'
    );
  });
});
