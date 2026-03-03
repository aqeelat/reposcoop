<script lang="ts">
  import { Markdown } from '$lib/components/ui/markdown';
  import type { Release } from '$lib/services/repo-api';
  import { compareVersions } from '$lib/utils/semver';

  let {
    releases,
    maxHeight = '24rem',
    showCollapseButton = true,
    onCollapse,
  } = $props<{
    releases: Release[];
    maxHeight?: string | number;
    showCollapseButton?: boolean;
    onCollapse: () => void;
  }>();

  // Local sorting state (per group)
  let sortBy = $state<'date' | 'version'>('date');
  let sortOrder = $state<'asc' | 'desc'>('desc');

  function compareVersionStrings(aStr?: string | null, bStr?: string | null) {
    return compareVersions(aStr, bStr);
  }

  const sorted = $derived.by(() => {
    const copy = [...releases];
    if (sortBy === 'date') {
      copy.sort((a, b) => {
        const da = new Date(a.published_at || a.created_at).getTime();
        const db = new Date(b.published_at || b.created_at).getTime();
        return da - db;
      });
    } else {
      copy.sort((a, b) => compareVersionStrings(a.version || a.tag_name, b.version || b.tag_name));
    }
    if (sortOrder === 'desc') copy.reverse();
    return copy;
  });
</script>

<!-- Toolbar: per-group sorting controls -->
<div class="flex flex-wrap items-center justify-between gap-2 border-t bg-white px-4 py-2 text-xs dark:bg-gray-800">
  <div class="flex flex-wrap items-center gap-3">
    <div class="flex items-center gap-1.5">
      <span class="text-[11px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Sort by</span>
      <div class="join" role="group" aria-label="Sort by">
        <button
          id="sort-by-date"
          class="btn join-item min-w-[5.5rem] btn-xs {sortBy === 'date' ? 'btn-active' : ''}"
          onclick={() => (sortBy = 'date')}
          aria-pressed={sortBy === 'date'}
          aria-label="Sort by release date"
        >
          Date
        </button>
        <button
          id="sort-by-version"
          class="btn join-item min-w-[5.5rem] btn-xs {sortBy === 'version' ? 'btn-active' : ''}"
          onclick={() => (sortBy = 'version')}
          aria-pressed={sortBy === 'version'}
          aria-label="Sort by version"
        >
          Version
        </button>
      </div>
    </div>

    <div class="flex items-center gap-1.5">
      <span class="text-[11px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Order</span>
      <div class="join" role="group" aria-label="Sort order">
        <button
          id="sort-order-desc"
          class="btn join-item min-w-[6.5rem] btn-xs {sortOrder === 'desc' ? 'btn-active' : ''}"
          onclick={() => (sortOrder = 'desc')}
          aria-pressed={sortOrder === 'desc'}
          aria-label="Sort in descending order"
        >
          Newest
        </button>
        <button
          id="sort-order-asc"
          class="btn join-item min-w-[6.5rem] btn-xs {sortOrder === 'asc' ? 'btn-active' : ''}"
          onclick={() => (sortOrder = 'asc')}
          aria-pressed={sortOrder === 'asc'}
          aria-label="Sort in ascending order"
        >
          Oldest
        </button>
      </div>
    </div>
  </div>

  {#if showCollapseButton}
    <button class="btn btn-ghost btn-xs" onclick={() => onCollapse()}> Collapse </button>
  {/if}
</div>

<ol
  class="divide-y divide-gray-100 overflow-y-auto border-t dark:divide-gray-700"
  style={`max-height: ${typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight}`}
>
  {#each sorted as release (release.id)}
    <li class="list-none p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700">
      <div class="flex items-start justify-between">
        <div class="min-w-0 flex-1">
          {#if release.body}
            <button
              class="btn flex h-auto min-h-0 w-full items-start justify-start gap-2 px-0 py-0 text-left normal-case btn-ghost hover:bg-transparent"
              onclick={() => (release.notesExpanded = !release.notesExpanded)}
              aria-expanded={release.notesExpanded || false}
              aria-controls={`notes-${release.id}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="mt-0.5 h-3 w-3 flex-none transition-transform duration-200 {release.notesExpanded
                  ? 'rotate-90'
                  : ''}"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <span class="min-w-0 flex-1">
                <h4 class="truncate text-sm font-medium" title={release.name || release.tag_name}>
                  {release.version || release.tag_name}
                </h4>
                <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  {new Date(release.published_at || release.created_at).toLocaleDateString()}
                </span>
              </span>
            </button>
          {:else}
            <h4 class="truncate text-sm font-medium" title={release.name || release.tag_name}>
              {release.version || release.tag_name}
            </h4>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {new Date(release.published_at || release.created_at).toLocaleDateString()}
            </p>
          {/if}
        </div>
        <a
          href={release.html_url}
          target="_blank"
          rel="noopener noreferrer"
          class="ml-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
          aria-label={`View ${release.version || release.tag_name} on GitHub (opens in new tab)`}
        >
          <span class="sr-only">GitHub</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true"
            ><path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.33 6.84 9.68c.5.1.68-.22.68-.49c0-.24-.01-.87-.01-1.71c-2.78.62-3.37-1.2-3.37-1.2c-.45-1.18-1.11-1.49-1.11-1.49c-.91-.64.07-.63.07-.63c1 .07 1.52 1.05 1.52 1.05c.9 1.56 2.36 1.11 2.94.85c.09-.67.35-1.11.63-1.37c-2.22-.26-4.56-1.14-4.56-5.08c0-1.12.39-2.03 1.03-2.75c-.1-.26-.45-1.3.1-2.71c0 0 .84-.27 2.75 1.05c.8-.23 1.65-.35 2.5-.35s1.7.12 2.5.35c1.9-1.32 2.74-1.05 2.74-1.05c.55 1.41.2 2.45.1 2.71c.64.72 1.02 1.63 1.02 2.75c0 3.95-2.34 4.82-4.57 5.07c.36.32.68.95.68 1.92c0 1.39-.01 2.5-.01 2.84c0 .27.18.6.69.49C19.13 20.58 22 16.76 22 12.26C22 6.58 17.52 2 12 2"
            /></svg
          >
        </a>
      </div>

      {#if release.body}
        <div class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {#if release.notesExpanded}
            <div id={`notes-${release.id}`} class="rounded-box border border-base-300 bg-base-200/60 p-3">
              <Markdown content={release.body} />
              <div class="mt-2 text-xs text-blue-500">
                <a
                  href={release.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View full release on GitHub for ${release.version || release.tag_name} (opens in new tab)`}
                >
                  View on GitHub
                  <span class="sr-only">Opens in new tab</span>
                </a>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </li>
  {/each}
</ol>

{#if showCollapseButton}
  <div class="bg-gray-50 p-3 text-center dark:bg-gray-700">
    <button class="btn btn-ghost btn-sm" onclick={() => onCollapse()}> Collapse </button>
  </div>
{/if}
