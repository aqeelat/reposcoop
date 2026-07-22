import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Markdown } from './index';

describe('Markdown Component', () => {
  it('should render without errors', () => {
    expect(() => {
      render(Markdown, { content: '# Test Heading' });
    }).not.toThrow();
  });

  it('should render Markdown content as HTML', async () => {
    render(Markdown, { content: '# Test Heading' });

    const heading = page.getByRole('heading', { level: 1, name: 'Test Heading' });
    await expect.element(heading).toBeInTheDocument();
  });

  it('should render paragraphs correctly', async () => {
    render(Markdown, { content: 'This is a paragraph.' });

    const paragraph = page.getByText('This is a paragraph.');
    await expect.element(paragraph).toBeInTheDocument();
  });

  it('should render lists correctly', async () => {
    render(Markdown, {
      content: `
- Item 1
- Item 2
- Item 3
      `,
    });

    const listItems = document.querySelectorAll('li');
    expect(listItems.length).toBe(3);
  });

  it('should render code blocks correctly', async () => {
    render(Markdown, {
      content: '```\nconst test = "code block";\n```',
    });

    const codeBlock = document.querySelector('pre code');
    expect(codeBlock).toBeTruthy();
  });

  it('should render links correctly', async () => {
    render(Markdown, {
      content: '[Test Link](https://example.com)',
    });

    const link = page.getByRole('link', { name: 'Test Link' });
    await expect.element(link).toBeInTheDocument();
    await expect.element(link).toHaveAttribute('href', 'https://example.com');
  });

  it('should apply custom class to container', async () => {
    render(Markdown, {
      content: 'Test content',
      class: 'custom-class',
    });

    const container = document.querySelector('.markdown-content.custom-class');
    expect(container).toBeTruthy();
  });

  it('should sanitize HTML to prevent XSS', async () => {
    render(Markdown, {
      content: '<script>alert("XSS")</script>',
    });

    const container = document.querySelector('.markdown-content');
    expect(container).toBeTruthy();
    const script = container!.querySelector('script');
    expect(script).toBeNull();
  });
});
