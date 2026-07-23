<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { parseGitHubUrl } from '$lib/utils/github';
  import { formatDistanceToNow } from 'date-fns';

  type RecentRepo = {
    owner: string;
    repo: string;
    fullName: string;
    timestamp: string; // ISO string
  };

  let repoUrl = $state<string>('');
  let isLoading = $state<boolean>(false);
  let validationError = $state<string>('');
  let recentRepos = $state<RecentRepo[]>([]);

  // Load recently viewed repositories from localStorage on component mount
  onMount((): void => {
    try {
      const storedRepos = localStorage.getItem('recentRepos');
      if (storedRepos) {
        recentRepos = JSON.parse(storedRepos) as RecentRepo[];
      }
    } catch (error) {
      console.error('Error loading recent repositories:', error);
    }
  });

  // Save a repository to recently viewed
  function saveToRecentRepos(owner: string, repo: string): void {
    try {
      // Create new repo object
      const newRepo: RecentRepo = {
        owner,
        repo,
        fullName: `${owner}/${repo}`,
        timestamp: new Date().toISOString(),
      };

      // Add to the beginning of the array (most recent first)
      // Filter out any duplicates of the same repo
      recentRepos = [newRepo, ...recentRepos.filter((r) => r.fullName !== newRepo.fullName)].slice(0, 5); // Keep only the 5 most recent

      // Save to localStorage
      localStorage.setItem('recentRepos', JSON.stringify(recentRepos));
    } catch (error) {
      console.error('Error saving recent repository:', error);
    }
  }

  function handleSubmit(event: Event): void {
    event.preventDefault();
    // Reset validation error
    validationError = '';

    // Parse and validate the GitHub repository URL
    const parsedUrl = parseGitHubUrl(repoUrl);

    if (parsedUrl) {
      isLoading = true;
      const { owner, repo } = parsedUrl;

      // Save to recently viewed repositories
      saveToRecentRepos(owner, repo);

      // Simulate a short delay to show loading state
      setTimeout(() => {
        goto(`/${owner}/${repo}`);
        isLoading = false;
      }, 500);
    } else {
      validationError = 'Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)';
    }
  }

  function viewRecentRepo(repo: RecentRepo): void {
    goto(`/${repo.owner}/${repo.repo}`);
  }
</script>

<div class="flex min-h-screen flex-col">
  <main class="flex-grow">
    <!-- Hero Section -->
    <section class="hero bg-gradient-to-b from-base-200 to-base-100">
      <div class="hero-content py-12 text-center md:py-20">
        <div class="max-w-4xl">
          <h1 class="mb-6 text-4xl font-bold md:text-5xl">
            <span class="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Welcome to RepoScoop
            </span>
            <span class="ml-2">📦🔍</span>
          </h1>
          <p class="mb-4 text-xl md:text-2xl">Skim GitHub release notes in a single glance.</p>
          <p class="mx-auto mb-8 max-w-2xl text-lg text-base-content/70">
            Paste any GitHub repo URL and get an instant, collapsible view of each package's versions, grouped by
            package name for quick scanning.
          </p>
        </div>
      </div>
    </section>

    <!-- Main Content -->
    <section class="py-12">
      <div class="container mx-auto px-4">
        <!-- Repository Input Form -->
        <div
          class="mx-auto mb-12 max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 class="mb-4 text-2xl font-semibold">Enter a GitHub Repository</h2>
          <form onsubmit={handleSubmit} class="flex flex-col gap-4">
            <div>
              <label for="repo-url" class="mb-1 block text-sm font-medium">GitHub Repository URL</label>
              <div class="relative">
                <input
                  id="repo-url"
                  type="text"
                  bind:value={repoUrl}
                  placeholder="https://github.com/owner/repo"
                  class="input-bordered input w-full pr-12"
                  class:input-error={validationError}
                  disabled={isLoading}
                />
                {#if validationError}
                  <div class="mt-1 text-sm text-red-500">{validationError}</div>
                {/if}
              </div>
            </div>
            <div>
              <button type="submit" disabled={isLoading} class="btn w-full btn-primary md:w-auto">
                {#if isLoading}
                  <span class="mr-2 inline-block">Loading...</span>
                  <svg class="inline-block h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                {:else}
                  View Releases
                {/if}
              </button>
            </div>
          </form>
        </div>

        <!-- Recently Viewed Repositories -->
        {#if recentRepos.length > 0}
          <div class="mx-auto mb-8 max-w-2xl">
            <h3 class="mb-3 flex items-center gap-2 text-xl font-semibold">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Recently Viewed
            </h3>
            <div class="space-y-2">
              {#each recentRepos as repo (repo.fullName)}
                <button
                  onclick={() => viewRecentRepo(repo)}
                  class="btn h-auto w-full justify-between btn-ghost p-4 normal-case"
                >
                  <span class="text-left">
                    <span class="block font-medium">{repo.fullName}</span>
                    <span class="block text-sm opacity-70">
                      Viewed {formatDistanceToNow(new Date(repo.timestamp))} ago
                    </span>
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 opacity-50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- How It Works Section -->
        <div class="mx-auto max-w-4xl">
          <h2 class="mb-6 text-center text-2xl font-semibold">How It Works</h2>
          <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div class="text-center">
              <div
                class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900"
              >
                <span class="text-2xl font-bold text-blue-600 dark:text-blue-300">1</span>
              </div>
              <h3 class="mb-2 font-semibold">Enter Repository URL</h3>
              <p class="text-gray-600 dark:text-gray-300">Paste any GitHub repository URL into the input field.</p>
            </div>
            <div class="text-center">
              <div
                class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900"
              >
                <span class="text-2xl font-bold text-blue-600 dark:text-blue-300">2</span>
              </div>
              <h3 class="mb-2 font-semibold">Smart Grouping</h3>
              <p class="text-gray-600 dark:text-gray-300">Releases are automatically grouped by package name.</p>
            </div>
            <div class="text-center">
              <div
                class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900"
              >
                <span class="text-2xl font-bold text-blue-600 dark:text-blue-300">3</span>
              </div>
              <h3 class="mb-2 font-semibold">Browse Releases</h3>
              <p class="text-gray-600 dark:text-gray-300">Expand packages to see all versions and release notes.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="border-t border-gray-200 bg-gray-50 py-8 dark:border-gray-800 dark:bg-gray-900">
    <div class="container mx-auto px-4">
      <div class="flex flex-col items-center justify-between md:flex-row">
        <div class="mb-4 md:mb-0">
          <p class="text-gray-600 dark:text-gray-300">© 2025 RepoScoop. All rights reserved.</p>
        </div>
        <nav class="flex gap-6">
          <a
            href="https://github.com/aqeelat/reposcoop"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 hover:underline dark:text-blue-400">GitHub</a
          >
        </nav>
      </div>
    </div>
  </footer>
</div>
