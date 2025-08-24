/**
 * Repository API Interface
 *
 * This module defines interfaces for interacting with different repository APIs
 * (GitHub, GitLab, Bitbucket, etc.) in a consistent way.
 *
 * To implement a new repository provider:
 * 1. Create a new class that implements the RepoApiProvider interface
 * 2. Implement all required methods
 * 3. Create and export a singleton instance of your provider
 * 4. Export the methods directly for convenience
 *
 * Example for GitLab:
 * ```typescript
 * export class GitLabApiProvider implements RepoApiProvider {
 *   // Implement all required methods
 *   public async fetchAllReleases(owner: string, repo: string): Promise<ApiResponse> {
 *     // Implementation for GitLab
 *   }
 *
 *   public async retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
 *     // Implementation for GitLab
 *   }
 * }
 *
 * // Create and export a singleton instance
 * export const gitlabApi = new GitLabApiProvider();
 *
 * // Export methods directly for convenience
 * export const { fetchAllReleases, retryWithBackoff } = gitlabApi;
 * ```
 */

/**
 * Interface for repository release objects
 * This is a platform-agnostic representation of a release
 */
export interface Release {
  id: number | string;
  url: string;
  html_url: string;
  tag_name: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  body: string;
  author: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

/**
 * Interface for API response metadata
 */
export interface ApiResponseMeta {
  rateLimit: {
    limit: number;
    remaining: number;
    reset: number;
  };
  lastPage: number;
  totalCount?: number;
}

/**
 * Interface for API response with releases and metadata
 */
export interface ApiResponse {
  releases: Release[];
  meta: ApiResponseMeta;
}

/**
 * Interface for repository API providers
 */
export interface RepoApiProvider {
  /**
   * Fetches a single page of releases from the repository API
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param page - Page number
   * @param perPage - Number of items per page
   * @returns Promise with releases and metadata
   */
  fetchReleasesPage(owner: string, repo: string, page?: number, perPage?: number): Promise<ApiResponse>;

  /**
   * Retries a failed API request with exponential backoff
   *
   * @param fn - Function to retry
   * @param retries - Maximum number of retries
   * @param delay - Initial delay in milliseconds
   * @returns Promise with the result of the function
   */
  retryWithBackoff<T>(fn: () => Promise<T>, retries?: number, delay?: number): Promise<T>;
}
