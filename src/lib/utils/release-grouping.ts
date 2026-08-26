/**
 * Release Grouping Utilities
 *
 * This module provides functions for grouping GitHub releases by package name.
 */

// import type { GitHubRelease } from '$lib/services/github-api';
import type { Release } from '$lib/services/repo-api';
import { normalizeVersion } from '$lib/utils/semver';
// export type { GitHubRelease } from '$lib/services/github-api';

/**
 * Interface for a grouped release
 */
export interface GroupedRelease extends Release {
  packageName: string;
  version: string;
  sortKey: string; // Used for sorting within a package group
  notesExpanded?: boolean; // Whether the release notes are expanded
}

/**
 * Interface for a package group
 */
export interface PackageGroup {
  name: string;
  releases: GroupedRelease[];
  latestRelease: GroupedRelease;
  releaseCount: number;
  isExpanded?: boolean;
}

/**
 * Interface for grouped releases result
 */
export interface GroupedReleases {
  groups: PackageGroup[];
  totalReleases: number;
}

/**
 * Generic descriptors that appear in release titles but are not package names
 * (e.g. "Release v4.8.1", "Version 6.0.0"). These collapse to the default group.
 */
const DEFAULT_PACKAGE_NAMES = new Set(['default', 'version', 'release']);

function isDefaultPackageName(name: string): boolean {
  return !name || DEFAULT_PACKAGE_NAMES.has(name.trim().toLowerCase());
}

/**
 * Common patterns for package names in release titles
 */
const PACKAGE_PATTERNS = [
  // @scope/package@version pattern (e.g., @clerk/nextjs@4.23.2)
  /^@([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)@(.*?)$/,

  // package@version pattern (e.g., nextjs@4.23.2)
  /^([a-zA-Z0-9-]+)@(.*?)$/,

  // v1.2.3 (packageName) pattern
  /^v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)(?:\s+\(([a-zA-Z0-9-]+)\))?$/,

  // packageName v1.2.3 pattern
  /^([a-zA-Z0-9-]+)\s+v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)$/,

  // packageName-1.2.3 pattern
  /^([a-zA-Z0-9-]+)-(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)$/,
];

/**
 * Extracts package name and version from a release title or tag
 *
 * @param title - Release title or tag
 * @returns Object with packageName and version, or null if no pattern matches
 */
export function extractPackageInfo(title: string): { packageName: string; version: string } | null {
  if (!title) return null;

  // Try each pattern
  for (const pattern of PACKAGE_PATTERNS) {
    const match = title.match(pattern);

    if (match) {
      // Handle different patterns
      if (pattern.toString().includes('@([a-zA-Z0-9-]+)\\/')) {
        // @scope/package@version pattern
        return {
          packageName: `@${match[1]}/${match[2]}`,
          version: match[3],
        };
      } else if (pattern.toString().includes('([a-zA-Z0-9-]+)@')) {
        // package@version pattern
        return {
          packageName: match[1],
          version: match[2],
        };
      } else if (pattern.toString().includes('\\(([a-zA-Z0-9-]+)\\)')) {
        // v1.2.3 (packageName) pattern
        return {
          packageName: match[2] || 'default',
          version: match[1],
        };
      } else if (pattern.toString().includes('([a-zA-Z0-9-]+)\\s+v?')) {
        // packageName v1.2.3 pattern
        return {
          packageName: match[1],
          version: match[2],
        };
      } else if (pattern.toString().includes('([a-zA-Z0-9-]+)-(\\d+')) {
        // packageName-1.2.3 pattern
        return {
          packageName: match[1],
          version: match[2],
        };
      }
    }
  }

  // If no pattern matches, try to extract from the first part of the title
  const parts = title.split(/[\s-]/);
  if (parts.length > 1) {
    const first = parts[0];
    // Treat version-like or generic 'Version'/'Release' prefixes as default
    if (
      first.toLowerCase() === 'version' ||
      first.toLowerCase() === 'release' ||
      first.toLowerCase() === 'v' ||
      /^\d+(?:\.\d+){1,3}$/.test(first)
    ) {
      return {
        packageName: 'default',
        version: title.replace(/^version\s+|^v\s+/i, '').trim(),
      };
    }

    // Use the first part as the package name
    return {
      packageName: first,
      version: title.replace(first, '').trim(),
    };
  }

  // If all else fails, use the entire title as the package name
  return {
    packageName: 'default',
    version: title,
  };
}

/**
 * Analyzes a repository's releases to detect common package name patterns
 *
 * @param releases - Array of repository releases
 * @returns Array of detected package name patterns
 */
export function detectPackagePatterns(releases: Release[]): string[] {
  const patterns = new Set<string>();

  for (const release of releases) {
    const tagInfo = extractPackageInfo(release.tag_name);
    const nameInfo = extractPackageInfo(release.name);

    if (tagInfo?.packageName && !isDefaultPackageName(tagInfo.packageName)) {
      patterns.add(tagInfo.packageName);
    }

    if (nameInfo?.packageName && !isDefaultPackageName(nameInfo.packageName)) {
      patterns.add(nameInfo.packageName);
    }
  }

  return Array.from(patterns);
}

/**
 * Groups releases by package name
 *
 * @param releases - Array of repository releases
 * @param repoName
 * @returns Grouped releases object
 */
export function groupReleasesByPackage(releases: Release[], repoName?: string): GroupedReleases {
  // Process each release
  const groupedReleases: GroupedRelease[] = releases.map((release) => {
    // Try to extract package info from tag name first; fall back to release name only if tag is unusable
    let packageInfo = extractPackageInfo(release.tag_name);

    if (!packageInfo) {
      packageInfo = extractPackageInfo(release.name);
    } else if (isDefaultPackageName(packageInfo.packageName)) {
      const nameInfo = extractPackageInfo(release.name);
      if (nameInfo && nameInfo.packageName && !isDefaultPackageName(nameInfo.packageName)) {
        packageInfo = nameInfo;
      }
    }

    // If still no package info, use default
    if (!packageInfo) {
      packageInfo = {
        packageName: 'default',
        version: release.tag_name || release.name,
      };
    }

    // Normalize the version using semver utilities where possible
    const primaryRaw = release.tag_name || release.name || packageInfo.version;
    const normalizedVersion =
      // Prefer the authoritative tag value first, then name, then any extracted fragment
      normalizeVersion(release.tag_name) ||
      normalizeVersion(release.name) ||
      normalizeVersion(packageInfo.version) ||
      // Fallback: keep the original primary raw string to avoid odd extractions like "-a-version"
      primaryRaw;

    // Create a sort key for version sorting (ISO date for now)
    const sortKey = release.published_at || release.created_at;

    return {
      ...release,
      packageName: packageInfo.packageName,
      version: normalizedVersion,
      sortKey,
      notesExpanded: false, // Initialize as collapsed
    };
  });

  // Determine repo group name
  const repoGroupName = repoName && repoName.trim().length > 0 ? repoName : 'repository';
  // Consider patterns meaningful if there is at least one non-default release
  const nonDefaultCount = groupedReleases.filter((r) => !isDefaultPackageName(r.packageName)).length;
  const hasPatterns = nonDefaultCount >= 1;

  // Group by computed group key
  const groupMap = new Map<string, GroupedRelease[]>();

  for (const release of groupedReleases) {
    let pkg = release.packageName;
    if (isDefaultPackageName(pkg)) {
      pkg = 'default';
      release.packageName = 'default';
    }

    const groupKey = !hasPatterns || pkg === 'default' ? repoGroupName : release.packageName;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    groupMap.get(groupKey)!.push(release);
  }

  // Sort releases within each group by date (newest first)
  for (const [key, rels] of groupMap.entries()) {
    groupMap.set(
      key,
      rels.sort((a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime()),
    );
  }

  // Create package groups from map entries
  const groups: PackageGroup[] = [];
  for (const [name, rels] of groupMap.entries()) {
    groups.push({
      name,
      releases: rels,
      latestRelease: rels[0],
      releaseCount: rels.length,
      isExpanded: false,
    });
  }

  // Sort groups alphabetically by name
  groups.sort((a, b) => a.name.localeCompare(b.name));

  return {
    groups,
    totalReleases: groupedReleases.length,
  };
}

/**
 * Sorts package groups by specified criteria
 *
 * @param groups - Array of package groups
 * @param sortBy - Sort criteria ('name', 'count', 'date')
 * @param sortOrder - Sort order ('asc' or 'desc')
 * @returns Sorted array of package groups
 */
export function sortPackageGroups(
  groups: PackageGroup[],
  sortBy: 'name' | 'count' | 'date' = 'name',
  sortOrder: 'asc' | 'desc' = 'asc',
): PackageGroup[] {
  const sortedGroups = [...groups];

  switch (sortBy) {
    case 'name':
      sortedGroups.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'count':
      sortedGroups.sort((a, b) => a.releaseCount - b.releaseCount);
      break;
    case 'date':
      sortedGroups.sort((a, b) => {
        const dateA = new Date(a.latestRelease.published_at || a.latestRelease.created_at);
        const dateB = new Date(b.latestRelease.published_at || b.latestRelease.created_at);
        return dateA.getTime() - dateB.getTime();
      });
      break;
  }

  // Reverse if descending order
  if (sortOrder === 'desc') {
    sortedGroups.reverse();
  }

  return sortedGroups;
}
