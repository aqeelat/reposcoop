# RepoScoop Development Guidelines

This document provides essential information for developers working on the RepoScoop project.

## Build and Configuration

### Project Setup

1. **Dependencies Installation**

   ```bash
   # Install dependencies using bun (recommended)
   bun install

   # Or using other package managers
   npm install
   pnpm install
   ```

2. **Playwright Browser Installation**

   The project uses Playwright for browser testing. You need to install the browsers:

   ```bash
   bunx playwright install
   # or
   npx playwright install
   ```

### Development Server

Start the development server:

```bash
bun run dev

# Open in browser automatically
bun run dev -- --open
```

### Production Build

Create a production build:

```bash
bun run build

# Preview the production build
bun run preview
```

### Deployment

The project is configured to deploy to Cloudflare using the `@sveltejs/adapter-cloudflare` adapter. No additional configuration is needed for basic Cloudflare Pages deployment.

## Testing

The project uses two testing frameworks:

1. **Vitest** - For unit and component tests
2. **Playwright** - For end-to-end tests

### Running Tests

```bash
# Run all tests (unit and e2e)
bun test

# Run only unit tests
bun run test:unit

# Run only e2e tests
bun run test:e2e

# Run specific test file
bun run test:unit -- --run src/path/to/test.ts
```

### Unit and Component Testing

Unit tests are located alongside the files they test with the naming pattern:

- Regular TypeScript files: `*.test.ts` or `*.spec.ts`
- Svelte component tests: `*.svelte.test.ts` or `*.svelte.spec.ts`

#### Component Test Example

Here's an example of a simple Svelte component test:

```typescript
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MyComponent from './MyComponent.svelte';

describe('MyComponent', () => {
  it('should render without errors', () => {
    expect(() => {
      render(MyComponent, {/* props */});
    }).not.toThrow();
  });
});
```

For more complex component testing, you can use the `page` object from `@vitest/browser/context`:

```typescript
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MyComponent from './MyComponent.svelte';

describe('MyComponent', () => {
  it('should render a heading', async () => {
    render(MyComponent);

    const heading = page.getByRole('heading', { level: 1 });
    await expect.element(heading).toBeInTheDocument();
  });
});
```

### End-to-End Testing

E2E tests are located in the `e2e` directory and use Playwright. They run against the production build of the application.

#### E2E Test Example

```typescript
import { expect, test } from '@playwright/test';

test('home page has expected heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});
```

### Adding New Tests

1. **For unit/component tests**:
   - Create a new file next to the file you're testing
   - Use `.test.ts` or `.spec.ts` extension
   - For Svelte components, use `.svelte.test.ts` or `.svelte.spec.ts`

2. **For E2E tests**:
   - Add new test files to the `e2e` directory
   - Use `.test.ts` extension

## Code Style and Development

### TypeScript and Svelte

- The project uses Svelte 5 with TypeScript
- Svelte 5 uses the new `$props()` syntax for component props
- The project supports both `.svelte` and `.svx` files (Markdown-enhanced Svelte)

### Styling

- The project uses Tailwind CSS for styling
- Additional Tailwind plugins:
  - `@tailwindcss/forms`
  - `@tailwindcss/typography`

### Code Quality Tools

- **ESLint**: For linting JavaScript/TypeScript
  - Run with `bun run lint`
- **Prettier**: For code formatting
  - Run with `bun run format`
- **TypeScript**: For type checking
  - Run with `bun run check`

### Project Structure

- `src/routes` - SvelteKit routes
- `src/lib` - Library code
- `static` - Static assets
- `e2e` - End-to-end tests

### Conventions

- Component files use PascalCase
- Route files use the SvelteKit convention (+page.svelte, +layout.svelte)
- Tests are co-located with the files they test

## Assistant Workflow and Commits

- Always commit after each task is finished to keep changes atomic and reviewable.
- Once the user is satisfied with a task, they will send a message containing "done". After receiving "done", commit the changes immediately.
