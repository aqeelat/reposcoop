import { describe, expect, it } from 'vitest';
import {
  detectPackagePatterns,
  extractPackageInfo,
  groupReleasesByPackage,
  sortPackageGroups,
} from './release-grouping';
import type { GitHubRelease } from '$lib/services/github-api';

// Mock GitHub releases for testing
const mockReleases: GitHubRelease[] = [
  {
    url: 'https://api.github.com/repos/test/repo/releases/1',
    html_url: 'https://github.com/test/repo/releases/tag/@scope/package-a@1.0.0',
    id: 1,
    tag_name: '@scope/package-a@1.0.0',
    name: '@scope/package-a@1.0.0',
    draft: false,
    prerelease: false,
    created_at: '2025-01-01T00:00:00Z',
    published_at: '2025-01-01T00:00:00Z',
    body: 'Release notes for @scope/package-a version 1.0.0',
    author: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser',
    },
  },
  {
    url: 'https://api.github.com/repos/test/repo/releases/2',
    html_url: 'https://github.com/test/repo/releases/tag/@scope/package-a@1.1.0',
    id: 2,
    tag_name: '@scope/package-a@1.1.0',
    name: '@scope/package-a@1.1.0',
    draft: false,
    prerelease: false,
    created_at: '2025-01-02T00:00:00Z',
    published_at: '2025-01-02T00:00:00Z',
    body: 'Release notes for @scope/package-a version 1.1.0',
    author: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser',
    },
  },
  {
    url: 'https://api.github.com/repos/test/repo/releases/3',
    html_url: 'https://github.com/test/repo/releases/tag/package-b@2.0.0',
    id: 3,
    tag_name: 'package-b@2.0.0',
    name: 'package-b@2.0.0',
    draft: false,
    prerelease: false,
    created_at: '2025-01-03T00:00:00Z',
    published_at: '2025-01-03T00:00:00Z',
    body: 'Release notes for package-b version 2.0.0',
    author: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser',
    },
  },
  {
    url: 'https://api.github.com/repos/test/repo/releases/4',
    html_url: 'https://github.com/test/repo/releases/tag/v3.0.0',
    id: 4,
    tag_name: 'v3.0.0',
    name: 'v3.0.0 (package-c)',
    draft: false,
    prerelease: false,
    created_at: '2025-01-04T00:00:00Z',
    published_at: '2025-01-04T00:00:00Z',
    body: 'Release notes for package-c version 3.0.0',
    author: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser',
    },
  },
  {
    url: 'https://api.github.com/repos/test/repo/releases/5',
    html_url: 'https://github.com/test/repo/releases/tag/package-d-4.0.0',
    id: 5,
    tag_name: 'package-d-4.0.0',
    name: 'package-d-4.0.0',
    draft: false,
    prerelease: false,
    created_at: '2025-01-05T00:00:00Z',
    published_at: '2025-01-05T00:00:00Z',
    body: 'Release notes for package-d version 4.0.0',
    author: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser',
    },
  },
  {
    url: 'https://api.github.com/repos/test/repo/releases/6',
    html_url: 'https://github.com/test/repo/releases/tag/package-e-v5.0.0',
    id: 6,
    tag_name: 'package-e v5.0.0',
    name: 'package-e v5.0.0',
    draft: false,
    prerelease: false,
    created_at: '2025-01-06T00:00:00Z',
    published_at: '2025-01-06T00:00:00Z',
    body: 'Release notes for package-e version 5.0.0',
    author: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser',
    },
  },
  {
    url: 'https://api.github.com/repos/test/repo/releases/7',
    html_url: 'https://github.com/test/repo/releases/tag/v6.0.0',
    id: 7,
    tag_name: 'v6.0.0',
    name: 'Version 6.0.0',
    draft: false,
    prerelease: false,
    created_at: '2025-01-07T00:00:00Z',
    published_at: '2025-01-07T00:00:00Z',
    body: 'Release notes for version 6.0.0',
    author: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser',
    },
  },
];

describe('Release Grouping Utilities', () => {
  describe('extractPackageInfo', () => {
    it('should extract package name and version from @scope/package@version format', () => {
      const result = extractPackageInfo('@scope/package-a@1.0.0');
      expect(result).toEqual({
        packageName: '@scope/package-a',
        version: '1.0.0',
      });
    });

    it('should extract package name and version from package@version format', () => {
      const result = extractPackageInfo('package-b@2.0.0');
      expect(result).toEqual({
        packageName: 'package-b',
        version: '2.0.0',
      });
    });

    it('should extract package name and version from v1.2.3 (packageName) format', () => {
      const result = extractPackageInfo('v3.0.0 (package-c)');
      expect(result).toEqual({
        packageName: 'package-c',
        version: '3.0.0',
      });
    });

    it('should extract package name and version from packageName-1.2.3 format', () => {
      const result = extractPackageInfo('package-d-4.0.0');
      expect(result).toEqual({
        packageName: 'package-d',
        version: '4.0.0',
      });
    });

    it('should extract package name and version from packageName v1.2.3 format', () => {
      const result = extractPackageInfo('package-e v5.0.0');
      expect(result).toEqual({
        packageName: 'package-e',
        version: '5.0.0',
      });
    });

    it('should handle version-only format by using default package name', () => {
      const result = extractPackageInfo('v6.0.0');
      expect(result?.packageName).toBe('default');
      expect(result?.version).toBe('6.0.0');
    });

    it('should handle empty input', () => {
      const result = extractPackageInfo('');
      expect(result).toBeNull();
    });
  });

  describe('detectPackagePatterns', () => {
    it('should detect package patterns from release titles and tags', () => {
      const patterns = detectPackagePatterns(mockReleases);

      // Should detect these package names
      expect(patterns).toContain('@scope/package-a');
      expect(patterns).toContain('package-b');
      expect(patterns).toContain('package-c');
      expect(patterns).toContain('package-d');
      expect(patterns).toContain('package-e');

      // Should not include 'default' as a pattern
      expect(patterns).not.toContain('default');

      // Should have 5 unique package patterns
      expect(patterns.length).toBe(5);
    });

    it('should return empty array for empty releases', () => {
      const patterns = detectPackagePatterns([]);
      expect(patterns).toEqual([]);
    });

    it('does not detect generic words like "Release" or "Version" as package patterns', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const releases: any[] = [
        { tag_name: 'v4.8.1', name: 'Release v4.8.1' },
        { tag_name: 'v4.8.0', name: 'Release v4.8.0' },
        { tag_name: 'v3.0.0', name: 'Version 3.0.0' },
      ];

      const patterns = detectPackagePatterns(releases);
      expect(patterns).not.toContain('Release');
      expect(patterns).not.toContain('release');
      expect(patterns).not.toContain('Version');
      expect(patterns).not.toContain('default');
    });
  });

  describe('groupReleasesByPackage', () => {
    it('should group releases by package name and put default ones under repo group', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = groupReleasesByPackage(mockReleases as any, 'repo');

      // Should have 6 groups: 5 package groups + 1 repo group holding the default/version release
      expect(result.groups.length).toBe(6);

      // Should have correct total count
      expect(result.totalReleases).toBe(7);

      // Check specific package groups
      const packageA = result.groups.find((g) => g.name === '@scope/package-a');
      expect(packageA).toBeDefined();
      expect(packageA?.releases.length).toBe(2);

      const packageB = result.groups.find((g) => g.name === 'package-b');
      expect(packageB).toBeDefined();
      expect(packageB?.releases.length).toBe(1);

      const repoGroup = result.groups.find((g) => g.name === 'repo');
      expect(repoGroup).toBeDefined();
      expect(repoGroup?.releases.length).toBe(1);
    });

    it('should sort releases within groups by date (newest first)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = groupReleasesByPackage(mockReleases as any, 'repo');

      // Get package-a group which has multiple releases
      const packageA = result.groups.find((g) => g.name === '@scope/package-a');

      // First release should be the newest one
      expect(packageA?.releases[0].published_at).toBe('2025-01-02T00:00:00Z');
      expect(packageA?.releases[1].published_at).toBe('2025-01-01T00:00:00Z');

      // Latest release should be set correctly
      expect(packageA?.latestRelease.published_at).toBe('2025-01-02T00:00:00Z');
    });

    it('should handle empty releases array', () => {
      const result = groupReleasesByPackage([], 'repo');

      expect(result.groups).toEqual([]);
      expect(result.totalReleases).toBe(0);
    });

    it('treats "Release vX.Y.Z" names as default and groups under repo name (e.g. less.js)', () => {
      // Newer less.js releases use name "Release vX.Y.Z" while the tag stays "vX.Y.Z";
      // "Release" must not become its own package group.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lessReleases: any[] = [
        { tag_name: 'v4.8.1', name: 'Release v4.8.1', published_at: '2026-07-27T00:00:00Z' },
        { tag_name: 'v4.8.0', name: 'Release v4.8.0', published_at: '2026-07-22T00:00:00Z' },
        { tag_name: 'v1.7.5', name: 'v1.7.5', published_at: '2014-11-01T00:00:00Z' },
      ];

      const result = groupReleasesByPackage(lessReleases, 'less.js');

      // Single group under the repo name, no "Release" group
      expect(result.groups.map((g) => g.name)).toEqual(['less.js']);
      expect(result.totalReleases).toBe(3);

      // Newest first
      expect(result.groups[0].releases.map((r) => r.tag_name)).toEqual(['v4.8.1', 'v4.8.0', 'v1.7.5']);
    });
  });

  describe('sortPackageGroups', () => {
    it('should sort package groups by name (alphabetically)', () => {
      const result = groupReleasesByPackage(mockReleases);
      const sorted = sortPackageGroups(result.groups, 'name', 'asc');

      // Should be sorted alphabetically
      expect(sorted[0].name).toBe('@scope/package-a');
      expect(sorted[1].name).toBe('package-b');
      expect(sorted[2].name).toBe('package-c');
    });

    it('should sort package groups by release count', () => {
      const result = groupReleasesByPackage(mockReleases);
      const sorted = sortPackageGroups(result.groups, 'count', 'desc');

      // Should be sorted by count (descending)
      expect(sorted[0].name).toBe('@scope/package-a'); // 2 releases
      // All others have 1 release
    });

    it('should sort package groups by date', () => {
      const result = groupReleasesByPackage(mockReleases);
      const sortedAll = sortPackageGroups(result.groups, 'date', 'desc');
      // Ignore the repository aggregate group when comparing package date ordering
      const sorted = sortedAll.filter((g) => g.name !== 'repository');

      // Should be sorted by date (descending)
      expect(sorted[0].name).toBe('package-e'); // 2025-01-06
      expect(sorted[1].name).toBe('package-d'); // 2025-01-05
      expect(sorted[2].name).toBe('package-c'); // 2025-01-04
    });

    it('should handle empty groups array', () => {
      const sorted = sortPackageGroups([], 'name', 'asc');
      expect(sorted).toEqual([]);
    });
  });
});
