import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GroupReleasesList from './GroupReleasesList.svelte';

type Release = import('$lib/services/repo-api').Release;

function makeRelease(
  id: number,
  tag: string,
  dateISO: string,
  extra?: Partial<Release> & { version?: string },
): Release & { version?: string } {
  return {
    id,
    url: `https://example.com/release/${id}`,
    html_url: `https://example.com/release/${id}`,
    tag_name: tag,
    name: tag,
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
    ...(extra ?? {}),
  };
}

function getRenderedVersions(): string[] {
  const items = Array.from(document.querySelectorAll('ol > li h4')) as HTMLHeadingElement[];
  return items.map((el) => el.textContent?.trim() || '');
}

const onCollapse = () => {};

describe('GroupReleasesList.svelte — in-group sorting', () => {
  it('defaults to sorting by date (desc)', async () => {
    const releases = [
      makeRelease(1, 'v1.2.0', '2024-01-01T00:00:00.000Z', { version: 'v1.2.0' }),
      makeRelease(2, 'refs/tags/v2.0.0-rc.1', '2025-01-01T00:00:00.000Z', {
        version: 'refs/tags/v2.0.0-rc.1',
      }),
      makeRelease(3, 'release-3.4.5', '2023-01-01T00:00:00.000Z', { version: 'release-3.4.5' }),
      makeRelease(4, 'not-a-version', '2022-01-01T00:00:00.000Z', { version: 'not-a-version' }),
    ];

    render(GroupReleasesList, { releases, showCollapseButton: false, onCollapse });

    // Expect newest date first
    const versions = getRenderedVersions();
    expect(versions).toEqual(['refs/tags/v2.0.0-rc.1', 'v1.2.0', 'release-3.4.5', 'not-a-version']);
  });

  it('can sort by version using semver normalization (desc)', async () => {
    const releases = [
      makeRelease(1, 'v1.2.0', '2024-01-01T00:00:00.000Z', { version: 'v1.2.0' }),
      makeRelease(2, 'refs/tags/v2.0.0-rc.1', '2025-01-01T00:00:00.000Z', {
        version: 'refs/tags/v2.0.0-rc.1',
      }),
      makeRelease(3, 'release-3.4.5', '2023-01-01T00:00:00.000Z', { version: 'release-3.4.5' }),
      makeRelease(4, 'not-a-version', '2022-01-01T00:00:00.000Z', { version: 'not-a-version' }),
    ];

    render(GroupReleasesList, { releases, showCollapseButton: false, onCollapse });

    // Change sort-by to version
    const sortByVersion = document.getElementById('sort-by-version') as HTMLButtonElement;
    sortByVersion.click();

    // Wait a tick for DOM to reflect sorting change
    await new Promise((r) => setTimeout(r, 0));

    const versions = getRenderedVersions();
    // Expect semver-desc: 3.4.5 > 2.0.0-rc.1 > 1.2.0 > unparsable
    expect(versions).toEqual(['release-3.4.5', 'refs/tags/v2.0.0-rc.1', 'v1.2.0', 'not-a-version']);
  });

  it('respects order toggle (asc/desc) for version and date', async () => {
    const releases = [
      makeRelease(1, 'v1.2.0', '2024-01-01T00:00:00.000Z', { version: 'v1.2.0' }),
      makeRelease(2, 'refs/tags/v2.0.0-rc.1', '2025-01-01T00:00:00.000Z', {
        version: 'refs/tags/v2.0.0-rc.1',
      }),
      makeRelease(3, 'release-3.4.5', '2023-01-01T00:00:00.000Z', { version: 'release-3.4.5' }),
      makeRelease(4, 'not-a-version', '2022-01-01T00:00:00.000Z', { version: 'not-a-version' }),
    ];

    render(GroupReleasesList, { releases, showCollapseButton: false, onCollapse });

    // Switch to version sort
    const sortByVersion = document.getElementById('sort-by-version') as HTMLButtonElement;
    sortByVersion.click();

    // By default desc; toggle to asc
    const sortOrderAsc = document.getElementById('sort-order-asc') as HTMLButtonElement;
    sortOrderAsc.click();

    // Wait a tick for DOM to reflect sorting change
    await new Promise((r) => setTimeout(r, 0));

    let versions = getRenderedVersions();
    expect(versions).toEqual(['not-a-version', 'v1.2.0', 'refs/tags/v2.0.0-rc.1', 'release-3.4.5']);

    // Switch back to date sort and keep asc
    const sortByDate = document.getElementById('sort-by-date') as HTMLButtonElement;
    sortByDate.click();

    // Wait a tick for DOM to reflect sorting change
    await new Promise((r) => setTimeout(r, 0));

    versions = getRenderedVersions();
    // Expect oldest to newest now
    expect(versions).toEqual(['not-a-version', 'release-3.4.5', 'v1.2.0', 'refs/tags/v2.0.0-rc.1']);
  });
});
