<script lang="ts">
  import type { PackageGroup } from '$lib/utils/release-grouping';
  import GroupReleasesList from './GroupReleasesList.svelte';

  let {
    group,
    collapsible = true,
    'on:toggle': ontoggle,
  } = $props<{
    group: PackageGroup;
    collapsible?: boolean;
    'on:toggle'?: (detail: { expanded: boolean }) => void;
  }>();

  function toggle(e?: Event) {
    if (!collapsible) return;
    if (e) e.stopPropagation();
    group.isExpanded = !group.isExpanded;
    ontoggle?.({ expanded: !!group.isExpanded });
  }
</script>

<li
  class="list-none overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-md dark:bg-gray-800"
>
  <!-- Header -->
  {#if collapsible}
    <div
      class="cursor-pointer border-b bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
      onclick={toggle}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle(e);
        }
      }}
      tabindex="0"
      role="button"
      aria-expanded={group.isExpanded || false}
      aria-controls={`releases-${group.name.replace(/[^a-zA-Z0-9]/g, '-')}`}
    >
      <div class="flex items-center justify-between">
        <h3 class="truncate font-semibold" title={group.name}>{group.name}</h3>
        <span class="flex items-center gap-2">
          <span class="rounded-full bg-blue-100 px-2 py-0.5 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {group.releaseCount}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 transition-transform duration-200 {group.isExpanded ? 'rotate-180' : ''}"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Latest: {new Date(group.latestRelease.published_at || group.latestRelease.created_at).toLocaleDateString()}
      </p>
    </div>
  {:else}
    <div class="border-b bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600">
      <div class="flex items-center justify-between">
        <h3 class="truncate font-semibold" title={group.name}>{group.name}</h3>
        <span class="flex items-center gap-2">
          <span class="rounded-full bg-blue-100 px-2 py-0.5 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {group.releaseCount}
          </span>
        </span>
      </div>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Latest: {new Date(group.latestRelease.published_at || group.latestRelease.created_at).toLocaleDateString()}
      </p>
    </div>
  {/if}

  <!-- Summary (collapsed) -->
  {#if !group.isExpanded && collapsible}
    <div class="p-4">
      <p class="mb-2 text-sm">
        Latest version: <span class="font-mono">{group.latestRelease.version || group.latestRelease.tag_name}</span>
      </p>
      <button
        class="btn w-full btn-outline btn-sm"
        onclick={(e) => {
          e.stopPropagation();
          group.isExpanded = true;
        }}
      >
        View Releases
      </button>
    </div>
  {/if}

  <!-- Expanded Releases -->
  {#if group.isExpanded || !collapsible}
    <div id={`releases-${group.name.replace(/[^a-zA-Z0-9]/g, '-')}`}>
      <GroupReleasesList
        releases={group.releases}
        showCollapseButton={collapsible}
        onCollapse={() => (group.isExpanded = false)}
      />
    </div>
  {/if}
</li>
