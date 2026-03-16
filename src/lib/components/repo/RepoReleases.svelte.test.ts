import { page } from '@vitest/browser/context';
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

function makeRelease(): Release {
  return {
    id: 1,
    url: 'https://example.com/release/1',
    html_url: 'https://example.com/release/1',
    tag_name: 'pkg-a@1.2.3',
    name: 'pkg-a@1.2.3',
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
  };
}

describe('RepoReleases.svelte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';

    const response: ApiResponse = {
      releases: [makeRelease()],
      meta: {
        rateLimit: {
          limit: 60,
          remaining: 59,
          reset: 0,
        },
        lastPage: 1,
      },
    };

    mockedGithubApi.fetchReleasesPage.mockResolvedValue(response);
    mockedGithubApi.retryWithBackoff.mockImplementation(async (fn: () => Promise<unknown>) => fn());
  });

  it('renders a single package in always-expanded mode', async () => {
    render(RepoReleases, { owner: 'acme', repo: 'widget' });

    await expect.element(page.getByRole('heading', { level: 2, name: 'Repository Summary' })).toBeInTheDocument();
    await expect.element(page.getByRole('heading', { level: 4, name: '1.2.3' })).toBeInTheDocument();

    expect(document.getElementById('sort-by-date')).toBeTruthy();
    expect(document.querySelector('[role="button"][aria-controls^="releases-"]')).toBeNull();
    expect(mockedGithubApi.fetchReleasesPage).toHaveBeenCalledWith('acme', 'widget', 1);
  });
});
