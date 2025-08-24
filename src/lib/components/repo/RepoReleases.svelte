<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { githubApi } from '$lib/services/github-api';
  import type { Release, ApiResponse } from '$lib/services/repo-api';
  import {
    groupReleasesByPackage,
    sortPackageGroups,
    type GroupedReleases,
    type PackageGroup,
  } from '$lib/utils/release-grouping';
  import GroupListItem from '$lib/components/repo/GroupListItem.svelte';
  import GroupCardItem from '$lib/components/repo/GroupCardItem.svelte';

  // Props
  let { owner, repo } = $props<{ owner: string; repo: string }>();

  // State variables
  let loading = $state(true);
  let loadingMore = $state(false);
  let error = $state<string | null>(null);
  let releases = $state<Release[]>([]);
  let apiResponse = $state<ApiResponse | null>(null);
  let groupedReleases = $state<GroupedReleases | null>(null);
  let retryCount = $state(0);
  const maxRetries = 3;

  // Pagination state
  let currentPage = $state(0);
  let lastPage = $state<number | null>(null);
  const initialPagesToLoad = 1;
  const pagesPerClick = 1;
  let rateLimitMessage = $state<string | null>(null);
  let rateLimitHitOnFirst = $state(false);

  // Sorting options
  let sortBy = $state<'name' | 'count' | 'date'>('name');
  let sortOrder = $state<'asc' | 'desc'>('asc');
  let sortedGroups = $state<PackageGroup[]>([]);

  // Filter options
  let filterText = $state('');

  // View options
  let viewMode = $state<'list' | 'cards'>('list');
  let ItemComponent = $derived(viewMode === 'cards' ? GroupCardItem : GroupListItem);

  // Fetch releases by pages with pagination
  async function fetchPage(pageNumber: number): Promise<boolean> {
    try {
      let resp: ApiResponse;
      if (typeof githubApi.retryWithBackoff !== 'function') {
        resp = await githubApi.fetchReleasesPage(owner, repo, pageNumber);
      } else {
        resp = await githubApi.retryWithBackoff(() => githubApi.fetchReleasesPage(owner, repo, pageNumber), maxRetries);
      }
      // Update lastPage from response if not set yet
      lastPage = resp.meta.lastPage ?? lastPage;
      apiResponse = resp; // keep latest meta/rate info
      // Append releases and regroup
      releases = [...releases, ...resp.releases];
      groupedReleases = groupReleasesByPackage(releases, repo);
      updateSortedGroups();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Detect rate limit and set message; do not set error to keep displaying partial data
      if (msg.toLowerCase().includes('rate limit')) {
        rateLimitMessage = msg;
        if (pageNumber === 1 && releases.length === 0) {
          rateLimitHitOnFirst = true;
        }
        return false;
      }
      // For non-rate-limit errors, only set error if we have nothing to show
      if (releases.length === 0) {
        error = err instanceof Error ? err.message : 'An unknown error occurred while fetching repository data';
      }
      console.error('Error fetching releases page', pageNumber, err);
      return false;
    }
  }

  async function initialLoad() {
    loading = true;
    error = null;
    rateLimitMessage = null;
    rateLimitHitOnFirst = false;
    releases = [];
    groupedReleases = null;
    currentPage = 0;
    lastPage = null;
    // First page to get lastPage, then up to 5 pages total (or until lastPage)
    const okFirst = await fetchPage(1);
    if (okFirst) {
      currentPage = 1;
      // Load up to total of 5 pages
      for (let i = 2; i <= initialPagesToLoad; i++) {
        if (lastPage && currentPage >= lastPage) break;
        const ok = await fetchPage(i);
        if (!ok) break; // stop on rate limit or error
        currentPage = i;
      }
    }
    // Finish loading state but keep any partial data visible
    loading = false;
  }

  async function loadMore() {
    if (loadingMore) return;
    loadingMore = true;
    rateLimitMessage = null; // will be set again if it happens
    for (let i = 0; i < pagesPerClick; i++) {
      if (lastPage && currentPage >= lastPage) break;
      const next = currentPage + 1;
      const ok = await fetchPage(next);
      if (!ok) break;
      currentPage = next;
    }
    loadingMore = false;
  }

  // Update sorted groups when sort options change
  function updateSortedGroups() {
    if (!groupedReleases) return;

    // Apply sorting
    sortedGroups = sortPackageGroups(groupedReleases.groups, sortBy, sortOrder);

    // Apply filtering if needed
    if (filterText) {
      sortedGroups = sortedGroups.filter((group) => group.name.toLowerCase().includes(filterText.toLowerCase()));
    }
  }

  // Watch for changes to sort options
  $effect(() => {
    if (sortBy || sortOrder) {
      updateSortedGroups();
    }
  });

  // Watch for changes to filter text
  $effect(() => {
    if (filterText !== undefined) {
      updateSortedGroups();
    }
  });

  // Retry fetching releases (re-run initial load)
  function handleRetry() {
    retryCount++;
    initialLoad();
  }

  // Fetch releases on component mount
  onMount(() => {
    initialLoad();
  });
</script>

<div class="container mx-auto p-4">
  <header class="mb-6">
    <div class="flex items-center gap-2">
      <h1 class="text-3xl font-bold">
        {owner}/{repo}
      </h1>
      <a
        class="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        href={`https://github.com/${owner}/${repo}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open repository on GitHub (opens in new tab)"
        title="Open on GitHub"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-6 w-6" aria-hidden="true"
          ><path
            fill="currentColor"
            d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.33 6.84 9.68c.5.1.68-.22.68-.49c0-.24-.01-.87-.01-1.71c-2.78.62-3.37-1.2-3.37-1.2c-.45-1.18-1.11-1.49-1.11-1.49c-.91-.64.07-.63.07-.63c1 .07 1.52 1.05 1.52 1.05c.9 1.56 2.36 1.11 2.94.85c.09-.67.35-1.11.63-1.37c-2.22-.26-4.56-1.14-4.56-5.08c0-1.12.39-2.03 1.03-2.75c-.1-.26-.45-1.3.1-2.71c0 0 .84-.27 2.75 1.05c.8-.23 1.65-.35 2.5-.35s1.7.12 2.5.35c1.9-1.32 2.74-1.05 2.74-1.05c.55 1.41.2 2.45.1 2.71c.64.72 1.02 1.63 1.02 2.75c0 3.95-2.34 4.82-4.57 5.07c.36.32.68.95.68 1.92c0 1.39-.01 2.5-.01 2.84c0 .27.18.6.69.49C19.13 20.58 22 16.76 22 12.26C22 6.58 17.52 2 12 2"
          /></svg
        >
      </a>
    </div>
    <p class="text-muted-foreground">Repository releases grouped by package</p>
  </header>

  <div class="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row">
    <button class="btn btn-outline" onclick={() => history.back()}>Back</button>

    {#if groupedReleases && !loading && !error}
      <div class="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center">
        <!-- Filter Input -->
        <div class="relative w-full sm:w-auto">
          <label for="package-filter" class="sr-only">Filter packages</label>
          <input
            id="package-filter"
            type="text"
            placeholder="Filter packages..."
            bind:value={filterText}
            class="input-bordered input w-full"
            aria-label="Filter packages by name"
          />
          {#if filterText}
            <button
              class="btn absolute top-1/2 right-2 -translate-y-1/2 transform btn-ghost btn-xs"
              onclick={() => (filterText = '')}
              aria-label="Clear filter"
              tabindex="0"
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  filterText = '';
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>

        <!-- Sort Controls -->
        <div class="join" role="group" aria-label="Sort options">
          <button
            class="btn join-item btn-sm {sortBy === 'name' ? 'btn-active' : ''}"
            onclick={() => {
              sortBy = 'name';
              sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            }}
            aria-label={`Sort by name ${sortBy === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : ''}`}
            aria-pressed={sortBy === 'name'}
            tabindex="0"
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                sortBy = 'name';
                sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
              }
            }}
          >
            Name {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            class="btn join-item btn-sm {sortBy === 'count' ? 'btn-active' : ''}"
            onclick={() => {
              sortBy = 'count';
              sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            }}
            aria-label={`Sort by count ${sortBy === 'count' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : ''}`}
            aria-pressed={sortBy === 'count'}
            tabindex="0"
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                sortBy = 'count';
                sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
              }
            }}
          >
            Count {sortBy === 'count' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            class="btn join-item btn-sm {sortBy === 'date' ? 'btn-active' : ''}"
            onclick={() => {
              sortBy = 'date';
              sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            }}
            aria-label={`Sort by date ${sortBy === 'date' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : ''}`}
            aria-pressed={sortBy === 'date'}
            tabindex="0"
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                sortBy = 'date';
                sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
              }
            }}
          >
            Date {sortBy === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </button>
        </div>

        <!-- View Controls -->
        <div class="join" role="group" aria-label="View options">
          <button
            class="btn join-item btn-sm {viewMode === 'list' ? 'btn-active' : ''}"
            onclick={() => (viewMode = 'list')}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            List
          </button>
          <button
            class="btn join-item btn-sm {viewMode === 'cards' ? 'btn-active' : ''}"
            onclick={() => (viewMode = 'cards')}
            aria-label="Card view"
            aria-pressed={viewMode === 'cards'}
          >
            Cards
          </button>
        </div>
      </div>
    {/if}
  </div>

  {#if !loading}
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <button
        class="btn btn-outline"
        onclick={loadMore}
        disabled={loadingMore || (lastPage !== null && currentPage >= lastPage)}
      >
        {loadingMore ? 'Loading…' : 'Load more'}
      </button>
      {#if rateLimitMessage}
        <span class="text-xs text-amber-600">Rate limit hit: {rateLimitMessage}</span>
      {/if}
      {#if lastPage !== null}
        <span class="text-xs text-gray-500">Page {Math.max(currentPage, 0)}/{lastPage}</span>
      {/if}
    </div>
  {/if}

  <div class="grid gap-4">
    {#if loading}
      <div class="rounded-lg border bg-gray-50 p-6 shadow-sm dark:bg-gray-800">
        <div class="flex flex-col items-center justify-center py-8">
          <div class="relative mb-6">
            <svg class="h-12 w-12 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="h-2 w-2 rounded-full bg-blue-600"></div>
            </div>
          </div>
          <h2 class="mb-3 text-xl font-semibold">Loading Repository Data</h2>
          <p class="max-w-md text-center text-gray-600 dark:text-gray-300">
            Please wait while we fetch and process the releases for this repository.
          </p>
          <div class="mt-4 text-xs text-gray-500 dark:text-gray-400">
            This may take a moment for repositories with many releases.
          </div>
        </div>
      </div>
    {:else if error}
      <div class="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-800 dark:bg-red-900/20">
        <div class="flex flex-col items-center gap-6 py-6 md:flex-row md:items-start">
          <div class="flex-shrink-0 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div class="flex-grow text-center md:text-left">
            <h2 class="mb-3 text-xl font-semibold text-red-700 dark:text-red-400">Error Loading Repository</h2>
            <p class="mb-4 max-w-xl text-red-600 dark:text-red-300">{error}</p>
            <div class="flex justify-center md:justify-start">
              <button onclick={handleRetry} class="btn border-red-300 btn-outline dark:border-red-700">
                {retryCount >= maxRetries ? 'Try Again' : `Retry (Attempt ${retryCount + 1}/${maxRetries + 1})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    {:else if !groupedReleases || releases.length === 0}
      <div class="rounded-lg border bg-gray-50 p-6 shadow-sm dark:bg-gray-800">
        <div class="flex flex-col items-center gap-6 py-6 md:flex-row md:items-start">
          <div class="flex-shrink-0 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <div class="flex-grow text-center md:text-left">
            {#if rateLimitHitOnFirst}
              <h2 class="mb-3 text-xl font-semibold">GitHub API rate limit reached</h2>
              <p class="max-w-xl text-gray-600 dark:text-gray-300">
                {rateLimitMessage ??
                  'You have hit the GitHub API rate limit. Please try again later or click “Load more” to retry after some time.'}
              </p>
            {:else}
              <h2 class="mb-3 text-xl font-semibold">No Releases Found</h2>
              <p class="max-w-xl text-gray-600 dark:text-gray-300">
                This repository doesn't have any releases yet. Releases are used to package and provide software to
                users.
              </p>
            {/if}
            <div class="mt-4">
              <a
                href={`https://github.com/${owner}/${repo}`}
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-blue-600 hover:underline dark:text-blue-400"
                aria-label={`View ${owner}/${repo} repository on GitHub (opens in new tab)`}
              >
                View repository on GitHub →
                <span class="sr-only">Opens in new tab</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div
        class="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
        in:fade|local={{ duration: 300 }}
      >
        <div
          class="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center"
          in:fly|local={{ x: -20, duration: 300 }}
        >
          <div>
            <h2 class="text-lg font-semibold">Repository Summary</h2>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Found {groupedReleases.totalReleases} releases across {groupedReleases.groups.length} packages
            </p>
          </div>
          {#if apiResponse?.meta?.rateLimit}
            <div class="rounded bg-white/50 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
              API Rate Limit: {apiResponse.meta.rateLimit.remaining} / {apiResponse.meta.rateLimit.limit} remaining
            </div>
          {/if}
        </div>
      </div>

      <!-- Package Groups -->
      <div class={`grid ${viewMode === 'cards' ? 'gap-4 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 divide-y'}`}>
        {#each sortedGroups as group, i (group.name)}
          <div in:fly|local={{ y: 20, delay: 50 * i, duration: 300 }}>
            <ItemComponent {group} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Custom styles for release previews */
  :global(.release-preview) {
    font-size: 0.875rem;
    line-height: 1.5;
  }

  :global(.release-preview h1),
  :global(.release-preview h2),
  :global(.release-preview h3) {
    font-size: 1rem;
    margin-top: 0.5rem;
    margin-bottom: 0.25rem;
  }

  :global(.release-preview p) {
    margin-bottom: 0.5rem;
  }

  :global(.release-preview ul),
  :global(.release-preview ol) {
    margin-left: 1rem;
    margin-bottom: 0.5rem;
  }

  :global(.release-preview li) {
    margin-bottom: 0.125rem;
  }

  :global(.release-preview pre),
  :global(.release-preview blockquote) {
    margin-bottom: 0.5rem;
  }

  /* Fade out the bottom of the preview */
  .max-h-24 {
    position: relative;
  }

  .max-h-24::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: linear-gradient(to bottom, transparent, white);
  }

  :global(.dark) .max-h-24::after {
    background: linear-gradient(to bottom, transparent, rgb(31, 41, 55));
  }
</style>
