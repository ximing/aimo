import path from 'node:path';

/**
 * Resolve `key` to an absolute path that stays strictly inside `basePath`.
 * `..` segments are rejected before normalize, because collapsing them can
 * still retarget a key that remains inside the base.
 */
export function resolveInsideBase(basePath: string, key: string): string {
  const base = path.resolve(basePath);
  const target = path.resolve(base, key);
  const relative = path.relative(base, target);
  const hasParentSegment = key.split(/[/\\]/).includes('..');
  if (
    hasParentSegment ||
    relative === '' ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    throw new Error('Storage key escapes base path');
  }
  return target;
}
