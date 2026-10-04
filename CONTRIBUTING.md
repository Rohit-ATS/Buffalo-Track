# Contributing to Buffalo-Track

Thanks for helping improve Buffalo-Track. Small, focused pull requests are the
easiest to review and release.

## Before opening an issue

- Search open and closed issues first.
- For a reproducible bug, include the affected page or endpoint, steps to
  reproduce it, the expected result, and the actual result.
- Do not include API keys, Supabase credentials, user data, or other sensitive
  information. Report security vulnerabilities privately instead of opening a
  public issue.

## Local setup

The frontend and backend can be developed independently.

```bash
# Frontend
cd frontend
bun install
cp .env.example .env
bun run dev

# Backend, from the repository root in a separate terminal
python -m pip install -r backend/requirements-dev.txt
python -m pytest backend/tests
```

Use the values described in `frontend/.env.example` and
`backend/.env.example`. Keep every real `.env` file local: it is ignored by
Git and must never be committed.

## Checks

Run the checks relevant to your change before opening a pull request:

```bash
# Backend
python -m pytest backend/tests

# Frontend
cd frontend
bun run test
bunx tsc --noEmit
bun run lint
bun run build
```

If you change `supabase/migrations/`, explain the migration's purpose and
compatibility in the pull request. Apply migrations only to a disposable local
or staging project while testing; never commit credentials or production data.

## Pull requests

- Keep the change scoped to one problem.
- Describe the user-visible effect and link the related issue with `Fixes #…`
  where applicable.
- Add or update a meaningful test when behavior changes.
- Update deployment or environment documentation when variables or hosting
  behavior changes.
- Do not force-push, rebase, or rewrite already published history: this
  repository is synchronized with Lovable.
