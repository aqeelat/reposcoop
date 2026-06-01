import { compare as semverCompare, clean as semverClean, coerce as semverCoerce, parse as semverParse } from 'semver';

/**
 * Normalize/clean a version-like string using the semver package (loose mode).
 * - Strips common prefixes like `refs/tags/` and an initial `v` when followed by a digit.
 * - Attempts `semver.clean` first to preserve valid pre-release/build metadata.
 * - Falls back to `semver.coerce` to extract the first valid semver.
 *
 * Returns a normalized version string like `1.2.3[-prerelease]` or null if unparsable.
 */
export function normalizeVersion(input?: string | null): string | null {
  const raw = (input || '').trim();
  if (!raw) return null;
  const stripped = raw
    .replace(/^refs\/tags\//i, '')
    .replace(/^v(?=\d)/i, '')
    .trim();
  const cleaned = semverClean(stripped, { loose: true });
  if (cleaned) return cleaned;
  const coerced = semverCoerce(stripped, { loose: true });
  return coerced ? coerced.version : null;
}

/**
 * Detect whether a version-like string contains a semver pre-release segment.
 * Parses the raw input directly (strips `refs/tags/` and `v` prefix) and checks
 * for pre-release identifiers (e.g. `-alpha.1`, `-beta.0`, `-rc.2`).
 * Returns false for non-parsable inputs.
 */
export function isPrerelease(version?: string | null): boolean {
  const raw = (version || '').trim();
  if (!raw) return false;
  const stripped = raw
    .replace(/^refs\/tags\//i, '')
    .replace(/^v(?=\d)/i, '')
    .trim();
  const parsed =
    semverParse(stripped, { loose: true }) ??
    semverParse(semverClean(stripped, { loose: true }) ?? '', { loose: true });
  if (parsed) return parsed.prerelease.length > 0;
  return false;
}

/**
 * Safe compare for two version-like strings.
 * - Uses normalizeVersion() on both values.
 * - Treats unparsable values as smaller than parsable ones.
 * - Returns a negative number if a < b, zero if equal, positive if a > b.
 */
export function compareVersions(aStr?: string | null, bStr?: string | null): number {
  const a = normalizeVersion(aStr);
  const b = normalizeVersion(bStr);
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return semverCompare(a, b, true /* loose */);
}
