# Contributing to DashClaw

First off, thank you for considering contributing to DashClaw! It's people like you that make DashClaw such a great tool for the AI agent community.

## Code of Conduct

By participating in this project, you agree to abide by the standard Open Source Code of Conduct. Please be respectful and professional in all interactions.

## Development Setup

To get started with the codebase:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/ucsandman/DashClaw.git
    cd DashClaw
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Copy the example environment file and fill in your details:
    ```bash
    cp .env.example .env.local
    ```
    You will need a [Neon](https://neon.tech) PostgreSQL connection string for the `DATABASE_URL`.

4.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

5.  **Run Tests**:
    ```bash
    npm run test -- --run
    ```

6.  **Manage Database Schema**:
    We use Drizzle ORM for schema management.
    ```bash
    npm run db:generate  # Generate migration files
    npm run db:push      # Apply changes to your Neon DB
    ```

## Project Structure

-   `app/`: The Next.js 15 dashboard (App Router), API routes, and UI components.
-   `agent-tools/`: Specialized Python CLI tools for agent memory, goals, and context tracking.
-   `sdk/`: The Node.js DashClaw SDK for instrumenting agents.
-   `sdk-python/`: The Python DashClaw SDK and parity test suite.
-   `scripts/`: Utility scripts for migrations, security scanning, and testing.

## Documentation Update Protocol

When changing architecture, behavior, or roadmap:

1.  Update canonical docs according to `docs/documentation-governance.md`.
2.  If behavior changed, update a decision record in `docs/decisions/`.
3.  If roadmap milestones changed, update `docs/rfcs/platform-convergence-status.md`.
4.  Include doc updates in the same PR as code changes.

## Pull Request Process

We welcome Pull Requests for bug fixes, features, and documentation improvements!

1.  Create a new branch for your work.
2.  Ensure your code follows the existing style and patterns.
3.  **Run Linting**: Before submitting, ensure there are no linting errors:
    ```bash
    npm run lint
    ```
4.  **Run CI parity checks locally** before opening a PR:
    ```bash
    npm run scripts:check-syntax
    npm run docs:check
    npm run openapi:check
    npm run api:inventory:check
    npm run route-sql:check
    ```
5.  Submit your PR with a clear description of the changes and the problem they solve.

## Code Style

-   **JavaScript**: We use standard ESLint configurations provided by Next.js.
-   **CSS**: We use Tailwind CSS for all styling. Please use utility classes rather than custom CSS where possible.
-   **Icons**: Use `lucide-react` for all iconography to maintain visual consistency.

## Security

If you discover a security vulnerability, please do NOT open a public issue. Instead, contact the maintainers directly so we can address it responsibly.

Happy coding!
