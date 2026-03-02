import { describe, it, expect } from 'vitest';
import { groupReleasesByPackage } from './release-grouping';
import type { Release } from '$lib/services/repo-api';

function makeRelease(id: number, tag: string, dateISO: string, name?: string): Release {
  return {
    id,
    url: `https://example.com/release/${id}`,
    html_url: `https://example.com/release/${id}`,
    tag_name: tag,
    name: name ?? tag,
    draft: false,
    prerelease: false,
    created_at: dateISO,
    published_at: dateISO,
    body: '',
    author: {
      login: 'tester',
      avatar_url: 'https://example.com/avatar.png',
      html_url: 'https://example.com/user/tester',
    },
  };
}

describe('groupReleasesByPackage — semver normalization of versions', () => {
  it('normalizes common tag formats using semver (clean/coerce) when setting release.version', () => {
    const releases: Release[] = [
      makeRelease(1, 'v1.2.0', '2024-01-01T00:00:00.000Z'),
      makeRelease(2, 'refs/tags/v2.0.0-rc.1', '2025-01-01T00:00:00.000Z'),
      makeRelease(3, 'release-3.4.5', '2023-01-01T00:00:00.000Z'),
      makeRelease(4, 'not-a-version', '2022-01-01T00:00:00.000Z'),
    ];

    const result = groupReleasesByPackage(releases, 'repo');
    // Collect normalized versions across all groups
    const versions = result.groups.flatMap((g) => g.releases.map((r) => r.version));
    expect(versions).toContain('1.2.0');
    expect(versions).toContain('2.0.0-rc.1');
    expect(versions).toContain('3.4.5');
    // Unparsable should remain as-is
    expect(versions).toContain('not-a-version');
  });
});
