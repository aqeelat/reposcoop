import { describe, it, expect, vi } from 'vitest';
import { page } from 'vitest/browser';
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

describe('GroupReleasesList.svelte — release notes', () => {
  it('expands and collapses release notes when body is present', async () => {
    const releases = [makeRelease(1, 'v1.0.0', '2025-01-01T00:00:00.000Z', { body: '## Release notes\n- bug fix' })];

    render(GroupReleasesList, { releases, showCollapseButton: false, onCollapse });

    const toggle = page.getByRole('button', { name: /v1\.0\.0/i });
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect.element(page.getByText('Release notes')).toBeVisible();

    await toggle.click();
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders release without body as plain heading (no toggle)', async () => {
    const releases = [makeRelease(1, 'v1.0.0', '2025-01-01T00:00:00.000Z', { body: '' })];

    render(GroupReleasesList, { releases, showCollapseButton: false, onCollapse });

    await expect.element(page.getByRole('heading', { level: 4, name: 'v1.0.0' })).toBeInTheDocument();
    expect(document.querySelector('button[aria-expanded]')).toBeNull();
  });

  it('shows collapse button when showCollapseButton is true', async () => {
    const releases = [makeRelease(1, 'v1.0.0', '2025-01-01T00:00:00.000Z')];
    const onCollapse = vi.fn();

    render(GroupReleasesList, { releases, showCollapseButton: true, onCollapse });

    const collapseButton = page.getByRole('button', { name: /collapse/i }).first();
    await collapseButton.click();
    expect(onCollapse).toHaveBeenCalled();
  });
});
