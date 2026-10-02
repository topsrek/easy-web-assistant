# GitHub publication

- Repository: https://github.com/topsrek/easy-web-assistant
- Visibility: public
- Branch: `main`
- Initial published snapshot commit: `c5c95f7108118da97cb5d19dc285425a8bec2f93`
- Snapshot date: 2026-10-02

## Snapshot evidence

- QA recorded 142 passing unit and integration tests across 15 files.
- The standalone Vite bundle completed successfully (2,147 modules).
- The desktop profile flow passed 1/1 against the production preview and synthetic demo backend.
- This snapshot is a work in progress. The full typecheck and package build are not verified; the mobile smoke and six category acceptance flows were still pending at publication time. Real Google model access and audio behavior have not been verified.
- QA also observed a layout issue where the delete button overlaps the lower corner on desktop and the input on mobile. It remains open.

## Publication scope

`.env`, local credentials, dependencies, build output, browser caches, and test result artifacts are excluded. The internal coordination log is not published because it contains private project and chat context. `.env.example` contains blank credential placeholders only.
