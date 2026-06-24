```markdown
# EsgForge Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the EsgForge TypeScript codebase. It covers file naming, import/export styles, commit message conventions, and testing patterns, providing clear examples and practical commands for efficient contribution.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `userProfile.ts`, `dataFetcher.test.ts`

### Import Style
- Use **absolute imports** for modules.
  - Example:
    ```typescript
    import { fetchData } from 'utils/dataFetcher';
    ```

### Export Style
- Use **named exports** exclusively.
  - Example:
    ```typescript
    // utils/dataFetcher.ts
    export function fetchData() { ... }
    ```

### Commit Messages
- Follow **Conventional Commits** with prefixes:
  - `feat`: for new features
  - `fix`: for bug fixes
- Example:
  ```
  feat: add ESG scoring algorithm
  fix: correct typo in report generator
  ```

## Workflows

### Feature Development
**Trigger:** When adding a new feature  
**Command:** `/feature`

1. Create a new branch: `git checkout -b feat/short-description`
2. Implement the feature using camelCase file names and absolute imports.
3. Use named exports for all modules.
4. Write or update tests in corresponding `.test.ts` files.
5. Commit with a message starting with `feat:`.
6. Open a pull request.

### Bug Fixing
**Trigger:** When fixing a bug  
**Command:** `/fix`

1. Create a new branch: `git checkout -b fix/short-description`
2. Locate and fix the bug, following code conventions.
3. Update or add tests to cover the fix.
4. Commit with a message starting with `fix:`.
5. Open a pull request.

## Testing Patterns

- Test files use the pattern: `*.test.ts`
- Place test files alongside the modules they test or in a dedicated test directory.
- Testing framework is not specified; follow the existing `.test.ts` structure.
- Example:
  ```typescript
  // utils/dataFetcher.test.ts
  import { fetchData } from 'utils/dataFetcher';

  describe('fetchData', () => {
    it('returns expected data', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command    | Purpose                       |
|------------|------------------------------|
| /feature   | Start a new feature workflow  |
| /fix       | Start a bug fix workflow      |
```
