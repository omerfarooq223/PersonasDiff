# AI Parallel Web

AI Parallel Web runs the same bounded journey across isolated browser personas on one explicitly approved public surface, captures timestamped evidence, and reports transparent observed differences without claiming causation.

## Day 1 quick start

1. Install Node.js 24 LTS and Docker Compose v2.
2. Run `npm install`; commit the generated lockfile.
3. Run `npx playwright install chromium`.
4. Run `npm run check`.
5. Run `npm run stack:up`.
6. Verify `http://localhost:3000/health/ready` and `http://localhost:4300/fixture`.
7. Run the fixture spike with the exact command in `DAY1_EXECUTION_GUIDE.md`.

The public-surface spike is prohibited until `docs/day-1/surface-review.md` is approved.
