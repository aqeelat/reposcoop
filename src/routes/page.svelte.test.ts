import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import * as navigation from '$app/navigation';
import Page from './+page.svelte';

// Mock the $app/navigation module
vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should render the page title', async () => {
    render(Page);

    const heading = page.getByRole('heading', { level: 1 });
    await expect.element(heading).toBeInTheDocument();
    await expect.element(heading).toHaveTextContent('Welcome to RepoScoop');
  });

  it('should render the repository URL input form', async () => {
    render(Page);

    const input = page.getByPlaceholder('https://github.com/owner/repo');
    const submitButton = page.getByRole('button', { name: 'View Releases' });

    await expect.element(input).toBeInTheDocument();
    await expect.element(submitButton).toBeInTheDocument();
  });

  it('should show validation error for invalid GitHub URL', async () => {
    render(Page);

    const input = page.getByPlaceholder('https://github.com/owner/repo');
    const submitButton = page.getByRole('button', { name: 'View Releases' });

    await input.fill('https://gitlab.com/user/repo');
    await submitButton.click();

    const errorMessage = page.getByText('Please enter a valid GitHub repository URL');
    await expect.element(errorMessage).toBeInTheDocument();
    expect(navigation.goto).not.toHaveBeenCalled();
  });

  it('should navigate to repository page for valid GitHub URL', async () => {
    render(Page);

    const input = page.getByPlaceholder('https://github.com/owner/repo');
    const submitButton = page.getByRole('button', { name: 'View Releases' });

    await input.fill('https://github.com/sveltejs/kit');
    await submitButton.click();

    // Wait for the timeout in the component
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(navigation.goto).toHaveBeenCalledWith('/r/sveltejs/kit');
  });

  it('should save repository to recently viewed in localStorage', async () => {
    render(Page);

    const input = page.getByPlaceholder('https://github.com/owner/repo');
    const submitButton = page.getByRole('button', { name: 'View Releases' });

    await input.fill('https://github.com/sveltejs/kit');
    await submitButton.click();

    // Wait for the timeout in the component
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(localStorageMock.setItem).toHaveBeenCalled();
    const savedRepos = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(savedRepos[0].owner).toBe('sveltejs');
    expect(savedRepos[0].repo).toBe('kit');
  });
});
