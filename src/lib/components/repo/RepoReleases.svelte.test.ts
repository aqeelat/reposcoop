import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

vi.mock('$lib/services/github-api', () => ({
  githubApi: {
    fetchReleasesPage: vi.fn(),
    retryWithBackoff: vi.fn(),
  },
}));

import RepoReleases from './RepoReleases.svelte';
import { githubApi } from '$lib/services/github-api';
import type { ApiResponse, Release } from '$lib/services/repo-api';

const mockedGithubApi = githubApi as unknown as {
  fetchReleasesPage: ReturnType<typeof vi.fn>;
  retryWithBackoff: ReturnType<typeof vi.fn>;
};

let releaseId = 0;

function makeRelease(overrides: Partial<Release> & { tag_name: string }): Release {
  releaseId++;
  return {
    id: releaseId,
    url: `https://example.com/release/${releaseId}`,
    html_url: `https://example.com/release/${releaseId}`,
    name: overrides.tag_name,
    draft: false,
    prerelease: false,
    created_at: '2025-01-01T00:00:00.000Z',
    published_at: '2025-01-01T00:00:00.000Z',
    body: '',
    author: {
      login: 'tester',
      avatar_url: 'https://example.com/avatar.png',
      html_url: 'https://example.com/user/tester',
    },
    ...overrides,
  };
}

function setupResponse(releases: Release[]) {
  const response: ApiResponse = {
    releases,
    meta: {
      rateLimit: { limit: 60, remaining: 59, reset: 0 },
      lastPage: 1,
    },
  };
  mockedGithubApi.fetchReleasesPage.mockResolvedValue(response);
  mockedGithubApi.retryWithBackoff.mockImplementation(async (fn: () => Promise<unknown>) => fn());
}

describe('RepoReleases.svelte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    releaseId = 0;

    setupResponse([makeRelease({ tag_name: 'pkg-a@1.2.3' })]);
  });

  it('renders a single package in always-expanded mode', async () => {
    render(RepoReleases, { owner: 'acme', repo: 'widget' });

    await expect.element(page.getByRole('heading', { level: 2, name: 'Repository Summary' })).toBeInTheDocument();
    await expect.element(page.getByRole('heading', { level: 4, name: '1.2.3' })).toBeInTheDocument();

    expect(document.getElementById('sort-by-date')).toBeTruthy();
    expect(document.querySelector('[role="button"][aria-controls^="releases-"]')).toBeNull();
    expect(mockedGithubApi.fetchReleasesPage).toHaveBeenCalledWith('acme', 'widget', 1);
  });

  describe('hide pre-releases toggle', () => {
    it('shows the toggle button in the toolbar', async () => {
      render(RepoReleases, { owner: 'acme', repo: 'widget' });

      await expect.element(page.getByRole('button', { name: 'Hide pre-releases' })).toBeInTheDocument();
    });

    it('filters out prereleases when toggled on', async () => {
      vi.clearAllMocks();
      const releases = [
        makeRelease({ tag_name: 'pkg-a@1.0.0', published_at: '2025-01-03T00:00:00.000Z' }),
        makeRelease({ tag_name: 'pkg-a@2.0.0-beta.1', published_at: '2025-01-02T00:00:00.000Z' }),
        makeRelease({ tag_name: 'pkg-a@1.1.0-rc.1', published_at: '2025-01-01T00:00:00.000Z' }),
      ];
      setupResponse(releases);

      render(RepoReleases, { owner: 'acme', repo: 'widget' });
      await expect.element(page.getByRole('heading', { level: 2, name: 'Repository Summary' })).toBeInTheDocument();

      const toggle = page.getByRole('button', { name: 'Hide pre-releases' });
      await expect.element(toggle).toHaveAttribute('aria-pressed', 'false');

      await toggle.click();

      await expect.element(toggle).toHaveAttribute('aria-pressed', 'true');

      await expect.element(page.getByRole('heading', { level: 4, name: '1.0.0' })).toBeInTheDocument();
      await expect.element(page.getByRole('heading', { level: 4, name: '2.0.0-beta.1' })).not.toBeInTheDocument();
      await expect.element(page.getByRole('heading', { level: 4, name: '1.1.0-rc.1' })).not.toBeInTheDocument();
    });

    it('shows filtered count in summary when toggle is active', async () => {
      vi.clearAllMocks();
      const releases = [
        makeRelease({ tag_name: 'pkg-a@1.0.0', published_at: '2025-01-02T00:00:00.000Z' }),
        makeRelease({
          tag_name: 'pkg-a@2.0.0-alpha.1',
          prerelease: true,
          published_at: '2025-01-01T00:00:00.000Z',
        }),
      ];
      setupResponse(releases);

      render(RepoReleases, { owner: 'acme', repo: 'widget' });
      await expect.element(page.getByRole('heading', { level: 2, name: 'Repository Summary' })).toBeInTheDocument();

      const summary = page.getByText('Found 2 releases across 1 packages');
      await expect.element(summary).toBeInTheDocument();

      await page.getByRole('button', { name: 'Hide pre-releases' }).click();

      await expect.element(summary).not.toBeInTheDocument();
      await expect.element(page.getByText(/Showing \d+ of \d+ releases/)).toBeInTheDocument();
    });

    it('hides groups that have only prereleases', async () => {
      vi.clearAllMocks();
      const releases = [
        makeRelease({ tag_name: 'stable-pkg@1.0.0', published_at: '2025-01-02T00:00:00.000Z' }),
        makeRelease({
          tag_name: 'beta-pkg@0.1.0',
          prerelease: true,
          published_at: '2025-01-01T00:00:00.000Z',
        }),
      ];
      setupResponse(releases);

      render(RepoReleases, { owner: 'acme', repo: 'widget' });
      await expect.element(page.getByRole('heading', { level: 2, name: 'Repository Summary' })).toBeInTheDocument();

      await expect.element(page.getByRole('heading', { level: 3, name: 'stable-pkg' })).toBeInTheDocument();
      await expect.element(page.getByRole('heading', { level: 3, name: 'beta-pkg' })).toBeInTheDocument();

      await page.getByRole('button', { name: 'Hide pre-releases' }).click();

      await expect.element(page.getByRole('heading', { level: 3, name: 'stable-pkg' })).toBeInTheDocument();
      await expect.element(page.getByRole('heading', { level: 3, name: 'beta-pkg' })).not.toBeInTheDocument();
    });

    it('restores all releases when toggled off', async () => {
      vi.clearAllMocks();
      const releases = [
        makeRelease({ tag_name: 'pkg-a@1.0.0', published_at: '2025-01-02T00:00:00.000Z' }),
        makeRelease({
          tag_name: 'pkg-a@2.0.0-beta.1',
          prerelease: true,
          published_at: '2025-01-01T00:00:00.000Z',
        }),
      ];
      setupResponse(releases);

      render(RepoReleases, { owner: 'acme', repo: 'widget' });
      await expect.element(page.getByRole('heading', { level: 2, name: 'Repository Summary' })).toBeInTheDocument();

      const toggle = page.getByRole('button', { name: 'Hide pre-releases' });

      await toggle.click();
      await expect.element(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect.element(page.getByText('1').first()).toBeInTheDocument();

      await toggle.click();
      await expect.element(toggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('filters releases where GitHub prerelease flag is true', async () => {
      vi.clearAllMocks();
      const releases = [
        makeRelease({ tag_name: 'pkg-a@1.0.0', published_at: '2025-01-02T00:00:00.000Z' }),
        makeRelease({ tag_name: 'pkg-a@1.1.0', prerelease: true, published_at: '2025-01-01T00:00:00.000Z' }),
      ];
      setupResponse(releases);

      render(RepoReleases, { owner: 'acme', repo: 'widget' });
      await expect.element(page.getByRole('heading', { level: 2, name: 'Repository Summary' })).toBeInTheDocument();

      await page.getByRole('button', { name: 'Hide pre-releases' }).click();

      await expect.element(page.getByText('Showing 1 of 2 releases')).toBeInTheDocument();
      await expect.element(page.getByRole('heading', { level: 4, name: '1.0.0' })).toBeInTheDocument();
      await expect.element(page.getByRole('heading', { level: 4, name: '1.1.0' })).not.toBeInTheDocument();
    });
  });
});
