/**
 * GitHub API Service
 *
 * This module provides a GitHub implementation of the RepoApiProvider interface
 * for interacting with the GitHub API, specifically for fetching repository releases.
 */

import type { ApiResponse, ApiResponseMeta, Release, RepoApiProvider } from './repo-api';

/**
 * GitHub-specific implementation of the Release interface
 */
export type GitHubRelease = Release;

/**
 * GitHub API Provider implementation
 */
export class GitHubApiProvider implements RepoApiProvider {
  /**
   * Extracts rate limit information from response headers
   *
   * @param headers - Response headers
   * @returns Rate limit object
   */
  private extractRateLimitInfo(headers: Headers): ApiResponseMeta['rateLimit'] {
    return {
      limit: parseInt(headers.get('x-ratelimit-limit') || '60', 10),
      remaining: parseInt(headers.get('x-ratelimit-remaining') || '0', 10),
      reset: parseInt(headers.get('x-ratelimit-reset') || '0', 10),
    };
  }

  /**
   * Extracts pagination information from Link header
   *
   * @param linkHeader - Link header string
   * @returns Last page number
   */
  private extractLastPage(linkHeader: string | null): number {
    if (!linkHeader) return 1;

    const lastPageMatch = linkHeader.match(/page=(\d+)&per_page=\d+>; rel="last"/);
    return lastPageMatch ? parseInt(lastPageMatch[1], 10) : 1;
  }

  /**
   * Fetches a single page of releases from the GitHub API
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param page - Page number
   * @param perPage - Number of items per page
   * @returns Promise with releases and metadata
   * @throws Error if the API request fails
   */
  public async fetchReleasesPage(owner: string, repo: string, page = 1, perPage = 100): Promise<ApiResponse> {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases?page=${page}&per_page=${perPage}`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'RepoScoop',
        },
      });

      if (!response.ok) {
        if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
          const resetTime = new Date(parseInt(response.headers.get('x-ratelimit-reset') || '0', 10) * 1000);
          throw new Error(`GitHub API rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}`);
        }

        if (response.status === 404) {
          throw new Error(`Repository ${owner}/${repo} not found`);
        }

        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const releases = (await response.json()) as GitHubRelease[];
      const rateLimit = this.extractRateLimitInfo(response.headers);
      const lastPage = this.extractLastPage(response.headers.get('Link'));

      return {
        releases,
        meta: {
          rateLimit,
          lastPage,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch releases from GitHub API');
    }
  }

  /**
   * Retries a failed API request with exponential backoff
   *
   * @param fn - Function to retry
   * @param retries - Maximum number of retries
   * @param delay - Initial delay in milliseconds
   * @returns Promise with the result of the function
   */
  public async retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) {
        throw error;
      }

      // If rate limited, wait until reset time if possible
      if (error instanceof Error && error.message.includes('rate limit exceeded')) {
        const resetMatch = error.message.match(/Resets at (.+)$/);
        if (resetMatch) {
          const resetTime = new Date(resetMatch[1]);
          const waitTime = resetTime.getTime() - Date.now() + 1000; // Add 1 second buffer
          if (waitTime > 0 && waitTime < 15 * 60 * 1000) {
            // Don't wait more than 15 minutes
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            return this.retryWithBackoff(fn, retries - 1, delay);
          }
        }
      }

      // Otherwise use exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retryWithBackoff(fn, retries - 1, delay * 2);
    }
  }
}

// Create and export a singleton instance of the GitHub API provider
export const githubApi = new GitHubApiProvider();
