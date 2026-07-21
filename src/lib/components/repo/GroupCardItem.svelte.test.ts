import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GroupCardItem from './GroupCardItem.svelte';

type GroupedRelease = import('$lib/utils/release-grouping').GroupedRelease;
type PackageGroup = import('$lib/utils/release-grouping').PackageGroup;

function makeRelease(id: number, version: string, packageName: string): GroupedRelease {
  const dateISO = '2025-01-01T00:00:00.000Z';
  return {
    id,
    url: `https://example.com/release/${id}`,
    html_url: `https://example.com/release/${id}`,
    tag_name: `${packageName}@${version}`,
    name: `${packageName}@${version}`,
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
    packageName,
    version,
    sortKey: dateISO,
    notesExpanded: false,
  };
}

function makeGroup(name: string, isExpanded = false): PackageGroup {
  const release = makeRelease(1, '1.2.3', name);
  return {
    name,
    releases: [release],
    latestRelease: release,
    releaseCount: 1,
    isExpanded,
  };
}

describe('GroupCardItem.svelte', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('expands and collapses when collapsible', async () => {
    const group = makeGroup('pkg-card', false);
    const onToggle = vi.fn();
    render(GroupCardItem, { group, 'on:toggle': onToggle });

    const viewReleases = page.getByRole('button', { name: 'View Releases' });
    await expect.element(viewReleases).toBeInTheDocument();
    await viewReleases.click();
    await expect.element(page.getByRole('heading', { level: 4, name: '1.2.3' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('View Releases');

    const header = page.getByRole('button', { name: /pkg-card/i });
    await header.click();

    await expect.element(viewReleases).toBeInTheDocument();
    await expect.element(header).toHaveAttribute('aria-expanded', 'false');
    expect(onToggle).toHaveBeenCalledWith({ expanded: false });
  });

  it('supports Enter key on the header toggle', async () => {
    const group = makeGroup('pkg-card-keyboard', false);
    render(GroupCardItem, { group });

    const header = document.querySelector('[aria-controls="releases-pkg-card-keyboard"]') as HTMLElement;
    expect(header).toBeTruthy();
    header.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(header.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders as always-expanded content when non-collapsible', async () => {
    const group = makeGroup('pkg-card-static', false);
    render(GroupCardItem, { group, collapsible: false });

    await expect.element(page.getByRole('heading', { level: 4, name: '1.2.3' })).toBeInTheDocument();
    expect(document.querySelector('[role="button"][aria-controls^="releases-"]')).toBeNull();
    expect(document.body.textContent).not.toContain('View Releases');
    expect(document.body.textContent).not.toContain('Collapse');
  });
});
