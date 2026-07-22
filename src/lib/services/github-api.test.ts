import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { githubApi } from './github-api';

// Mock data for testing (removed unused variables)

// Mock headers for testing
const mockHeaders = {
  get: (name: string) => {
    switch (name) {
      case 'x-ratelimit-limit':
        return '60';
      case 'x-ratelimit-remaining':
        return '59';
      case 'x-ratelimit-reset':
        return '1609459200';
      case 'Link':
        return '<https://api.github.com/repos/test/repo/releases?page=2&per_page=100>; rel="next", <https://api.github.com/repos/test/repo/releases?page=2&per_page=100>; rel="last"';
      default:
        return null;
    }
  },
};

// Mock fetch implementation
const mockFetch = vi.fn();

describe('GitHub API Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GitHubApiProvider', () => {
    it('should implement the RepoApiProvider interface', () => {
      // Verify that the githubApi instance has all the required methods
      expect(githubApi).toHaveProperty('fetchReleasesPage');
      expect(githubApi).toHaveProperty('retryWithBackoff');

      // Verify that the methods are functions
      expect(typeof githubApi.fetchReleasesPage).toBe('function');
      expect(typeof githubApi.retryWithBackoff).toBe('function');
    });
  });

  describe('fetchReleasesPage', () => {
    it('should fetch releases from the GitHub API', async () => {
      // Mock successful response with example data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            url: 'https://api.github.com/repos/clerk/javascript/releases/1',
            html_url: 'https://github.com/clerk/javascript/releases/tag/v1.0.0',
            id: 1,
            tag_name: 'v1.0.0',
            name: 'Version 1.0.0',
            draft: false,
            prerelease: false,
            created_at: '2023-01-01T00:00:00Z',
            published_at: '2023-01-01T00:00:00Z',
            body: 'Example release notes',
            author: {
              login: 'clerk-user',
              avatar_url: 'https://github.com/clerk-user.png',
              html_url: 'https://github.com/clerk-user',
            },
          },
        ],
        headers: mockHeaders,
      });

      const result = await githubApi.fetchReleasesPage('clerk', 'javascript', 1);

      // Check that fetch was called with the correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/clerk/javascript/releases?page=1&per_page=100',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'RepoScoop',
          }),
        }),
      );

      // Check the result structure
      expect(result.releases).toHaveLength(1);
      expect(result.releases[0].tag_name).toBe('v1.0.0');
      expect(result.meta).toEqual({
        rateLimit: {
          limit: 60,
          remaining: 59,
          reset: 1609459200,
        },
        lastPage: 2,
      });
    });

    it('should handle API errors correctly', async () => {
      // Mock a 404 response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: () => null,
        },
      });

      // Expect the function to throw an error with updated message
      await expect(githubApi.fetchReleasesPage('test', 'repo')).rejects.toThrow(
        "Repository test/repo not found. It may be private or doesn't exist.",
      );
    });

    it('should handle rate limit errors correctly', async () => {
      // Mock a rate limit response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: {
          get: (name: string) => {
            switch (name) {
              case 'x-ratelimit-remaining':
                return '0';
              case 'x-ratelimit-reset':
                return '1609459200';
              default:
                return null;
            }
          },
        },
      });

      // Expect the function to throw an error with rate limit information
      await expect(githubApi.fetchReleasesPage('test', 'repo')).rejects.toThrow('GitHub API rate limit exceeded');
    });

    it('should throw on generic non-404 non-rate-limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: () => null },
      });

      await expect(githubApi.fetchReleasesPage('test', 'repo')).rejects.toThrow(
        'GitHub API error: 500 Internal Server Error',
      );
    });

    it('should wrap non-Error throwables with cause', async () => {
      mockFetch.mockRejectedValueOnce('network failure');

      await expect(githubApi.fetchReleasesPage('test', 'repo')).rejects.toThrow(
        'Failed to fetch releases from GitHub API',
      );
    });
  });

  describe('retryWithBackoff', () => {
    it('should retry failed requests', async () => {
      const mockFn = vi.fn();

      // Fail twice, then succeed
      mockFn.mockRejectedValueOnce(new Error('Failed 1'));
      mockFn.mockRejectedValueOnce(new Error('Failed 2'));
      mockFn.mockResolvedValueOnce('Success');

      // Mock setTimeout to avoid waiting in tests
      vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback: () => void) => {
        callback();
        return 0 as unknown as NodeJS.Timeout;
      });

      const result = await githubApi.retryWithBackoff(mockFn, 3, 10);

      // Function should be called 3 times
      expect(mockFn).toHaveBeenCalledTimes(3);

      // Result should be the successful value
      expect(result).toBe('Success');
    });

    it('should throw after max retries', async () => {
      const mockFn = vi.fn();

      // Always fail
      mockFn.mockRejectedValue(new Error('Always fails'));

      // Mock setTimeout to avoid waiting in tests
      vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback: () => void) => {
        callback();
        return 0 as unknown as NodeJS.Timeout;
      });

      // Expect the function to throw after max retries
      await expect(githubApi.retryWithBackoff(mockFn, 2, 10)).rejects.toThrow('Always fails');

      // Function should be called exactly maxRetries + 1 times
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 404 errors', async () => {
      const mockFn = vi.fn();

      // Mock a 404 error (repository not found)
      mockFn.mockRejectedValue(new Error("Repository test/repo not found. It may be private or doesn't exist."));

      // Mock setTimeout to avoid waiting in tests
      vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback: () => void) => {
        callback();
        return 0 as unknown as NodeJS.Timeout;
      });

      // Expect the function to throw immediately without retries
      await expect(githubApi.retryWithBackoff(mockFn, 3, 10)).rejects.toThrow(
        "Repository test/repo not found. It may be private or doesn't exist.",
      );

      // Function should be called only once (no retries)
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should wait until rate limit reset then retry', async () => {
      const mockFn = vi.fn();
      const futureTime = new Date(Date.now() + 5000).toLocaleTimeString();
      mockFn.mockRejectedValueOnce(new Error(`GitHub API rate limit exceeded. Resets at ${futureTime}`));
      mockFn.mockResolvedValueOnce('Success');

      vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback: () => void) => {
        callback();
        return 0 as unknown as NodeJS.Timeout;
      });

      const result = await githubApi.retryWithBackoff(mockFn, 3, 10);

      expect(result).toBe('Success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not wait if rate limit reset is more than 15 minutes away', async () => {
      const mockFn = vi.fn();
      const farFutureTime = new Date(Date.now() + 20 * 60 * 1000).toLocaleTimeString();
      const rateLimitError = new Error(`GitHub API rate limit exceeded. Resets at ${farFutureTime}`);
      mockFn.mockRejectedValue(rateLimitError);

      vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback: () => void) => {
        callback();
        return 0 as unknown as NodeJS.Timeout;
      });

      await expect(githubApi.retryWithBackoff(mockFn, 3, 10)).rejects.toThrow(rateLimitError);
    });
  });
});
