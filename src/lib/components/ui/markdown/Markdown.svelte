<script lang="ts">
  /**
   * Markdown component for rendering Markdown content
   *
   * @component
   * @example
   * ```svelte
   * <Markdown content="# Hello World" />
   * ```
   */
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import Prism from 'prismjs';

  // Import Prism themes and languages as needed
  import 'prismjs/themes/prism-tomorrow.css';
  // Common languages for release notes
  import 'prismjs/components/prism-javascript';
  import 'prismjs/components/prism-typescript';
  import 'prismjs/components/prism-json';
  import 'prismjs/components/prism-bash';
  import 'prismjs/components/prism-markdown';

  /**
   * Component props
   * @property {string} content - The Markdown content to render
   * @property {string} [class] - Additional CSS classes to apply to the container
   */
  let { content = '', class: className = '' } = $props();

  // Reference to the container element
  let container = $state<HTMLDivElement>();

  // Rendered HTML content
  let html = $state('');

  // Process Markdown when content changes
  $effect(() => {
    if (content) {
      // Parse Markdown to HTML
      const rawHtml = marked.parse(content, {
        breaks: true, // Convert line breaks to <br>
        gfm: true, // Enable GitHub Flavored Markdown
        async: false,
      });

      // Sanitize HTML to prevent XSS attacks
      html = DOMPurify.sanitize(rawHtml);
    }
  });

  // Apply syntax highlighting after HTML is rendered or changed
  $effect(() => {
    if (html && container) {
      Prism.highlightAllUnder(container);
    }
  });
</script>

<div bind:this={container} class="markdown-content {className}">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html html}
</div>

<style>
  .markdown-content :global(h1),
  .markdown-content :global(h2),
  .markdown-content :global(h3),
  .markdown-content :global(h4),
  .markdown-content :global(h5),
  .markdown-content :global(h6) {
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }

  .markdown-content :global(h1) {
    font-size: 1.5rem;
  }

  .markdown-content :global(h2) {
    font-size: 1.25rem;
  }

  .markdown-content :global(h3) {
    font-size: 1.125rem;
  }

  .markdown-content :global(p) {
    margin-bottom: 1em;
  }

  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin-left: 1.5em;
    margin-bottom: 1em;
  }

  .markdown-content :global(ul) {
    list-style-type: disc;
  }

  .markdown-content :global(ol) {
    list-style-type: decimal;
  }

  .markdown-content :global(li) {
    margin-bottom: 0.25em;
  }

  .markdown-content :global(code) {
    font-family: monospace;
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
  }

  .markdown-content :global(pre) {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 1em;
    border-radius: 5px;
    overflow-x: auto;
    margin-bottom: 1em;
  }

  .markdown-content :global(pre code) {
    background-color: transparent;
    padding: 0;
  }

  .markdown-content :global(blockquote) {
    border-left: 4px solid rgba(0, 0, 0, 0.1);
    padding-left: 1em;
    margin-left: 0;
    margin-right: 0;
    font-style: italic;
  }

  .markdown-content :global(a) {
    color: #3b82f6;
    text-decoration: none;
  }

  .markdown-content :global(a:hover) {
    text-decoration: underline;
  }

  .markdown-content :global(table) {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1em;
  }

  .markdown-content :global(th),
  .markdown-content :global(td) {
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 0.5em;
    text-align: left;
  }

  .markdown-content :global(th) {
    background-color: rgba(0, 0, 0, 0.05);
  }

  /* Dark mode adjustments */
  :global(.dark) .markdown-content :global(code) {
    background-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .markdown-content :global(pre) {
    background-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .markdown-content :global(blockquote) {
    border-left-color: rgba(255, 255, 255, 0.2);
  }

  :global(.dark) .markdown-content :global(a) {
    color: #60a5fa;
  }

  :global(.dark) .markdown-content :global(th),
  :global(.dark) .markdown-content :global(td) {
    border-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .markdown-content :global(th) {
    background-color: rgba(255, 255, 255, 0.05);
  }
</style>
