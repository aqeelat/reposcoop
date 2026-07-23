<script lang="ts">
  import { page } from '$app/state';
  import RepoPage from '$lib/components/repo/RepoPage.svelte';
  // ponytail: [owner]/[repo]/[...rest] mirrors GitHub's URL shape so a host swap alone
  // (github.com/o/r/releases -> reposcoop.../o/r/releases) deep-links correctly. Extra path
  // after the repo name is intentionally ignored. Greedy [owner] is fine here because the only
  // other root route is static `/`; add a static segment if a future 2-segment root route is needed.
  const owner = $derived(page.params.owner!);
  const repo = $derived(page.params.repo!);
</script>

<RepoPage {owner} {repo} />
