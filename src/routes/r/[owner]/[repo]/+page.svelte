<script lang="ts">
  import { page } from '$app/state';
  import RepoPage from '$lib/components/repo/RepoPage.svelte';
  const owner = $derived(page.params.owner!);
  const repo = $derived(page.params.repo!);
</script>

<RepoPage {owner} {repo} />
