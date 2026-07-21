<script lang="ts">
  import type { PackageGroup } from '$lib/utils/release-grouping';
  import GroupReleasesList from './GroupReleasesList.svelte';
  import { untrack } from 'svelte';

  let {
    group,
    collapsible = true,
    'on:toggle': ontoggle,
  } = $props<{
    group: PackageGroup;
    collapsible?: boolean;
    'on:toggle'?: (detail: { expanded: boolean }) => void;
  }>();

  let isExpanded = $state(untrack(() => group.isExpanded ?? false));
  $effect(() => {
    group.isExpanded = isExpanded;
  });

  function toggle(e?: Event) {
    if (!collapsible) return;
    if (e) e.stopPropagation();
    isExpanded = !isExpanded;
    ontoggle?.({ expanded: isExpanded });
  }
</script>

<li class="list-none border-b first:border-t dark:border-gray-700">
  <!-- Collapsed Row / Summary -->
  {#if collapsible}
    <div
      class="flex cursor-pointer items-center gap-3 px-2 py-3 hover:bg-gray-50 sm:px-3 dark:hover:bg-gray-800/70"
      role="button"
      tabindex="0"
      aria-expanded={isExpanded || false}
      aria-controls={`releases-${group.name.replace(/[^a-zA-Z0-9]/g, '-')}`}
      onclick={toggle}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle(e);
        }
      }}
    >
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h3 class="truncate font-semibold" title={group.name}>{group.name}</h3>
          <!-- release count chip -->
          <span
            class="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          >
            {group.releaseCount}
          </span>
        </div>
        <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Latest:</span>
          <span class="truncate font-mono">{group.latestRelease.version || group.latestRelease.tag_name}</span>
          <span class="opacity-60">•</span>
          <span
            >{new Date(group.latestRelease.published_at || group.latestRelease.created_at).toLocaleDateString()}</span
          >
        </div>
      </div>

      <!-- Actions: expand chevron -->
      <div class="flex flex-none items-center gap-2 pl-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  {:else}
    <div class="flex items-center gap-3 px-2 py-3 hover:bg-gray-50 sm:px-3 dark:hover:bg-gray-800/70">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h3 class="truncate font-semibold" title={group.name}>{group.name}</h3>
          <!-- release count chip -->
          <span
            class="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          >
            {group.releaseCount}
          </span>
        </div>
        <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Latest:</span>
          <span class="truncate font-mono">{group.latestRelease.version || group.latestRelease.tag_name}</span>
          <span class="opacity-60">•</span>
          <span
            >{new Date(group.latestRelease.published_at || group.latestRelease.created_at).toLocaleDateString()}</span
          >
        </div>
      </div>
    </div>
  {/if}

  {#if isExpanded || !collapsible}
    <div id={`releases-${group.name.replace(/[^a-zA-Z0-9]/g, '-')}`} class="bg-gray-50/70 dark:bg-gray-800/60">
      <GroupReleasesList
        releases={group.releases}
        showCollapseButton={collapsible}
        onCollapse={() => (isExpanded = false)}
      />
    </div>
  {/if}
</li>
