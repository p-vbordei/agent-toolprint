# Contributing to agent-toolprint

Thanks for considering a contribution. This is a small, sharp library — keep it that way and we'll merge fast.

## Setup

```bash
git clone <repo-url> agent-toolprint
cd agent-toolprint
bun install
```

Requires [Bun](https://bun.sh/) ≥ 1.3. The project does not target Node directly (see [ROADMAP.md](./ROADMAP.md) "Publishing for Node consumers" if that's your need).

## Day-to-day commands

```bash
bun test                # unit tests (52)
bun run typecheck       # tsc --noEmit
bun run conformance     # 12 JSON vectors against the ref impl
bun run demo            # the 20-line example from the README
bun check               # biome lint + format check
bun run format          # biome format --write
```

CI runs every one of these on every PR. If they all pass locally, CI will pass.

## Workflow — TDD, always

1. Write a failing test that captures the new behaviour.
2. Run it — confirm it fails for the expected reason.
3. Write the smallest implementation that makes it pass.
4. Run the test — confirm it passes.
5. Refactor only if needed.
6. Commit.

Tiny commits, one logical change each. The implementation history in [`docs/superpowers/plans/2026-04-24-v0.1.0.md`](./docs/superpowers/plans/2026-04-24-v0.1.0.md) is the worked example — 27 tasks, ~5 steps each.

## Commit messages

```
<type>(<area>): <short summary>

<optional body, wrap at ~72>
```

Types: `feat`, `fix`, `test`, `chore`, `docs`, `refactor`, `ci`. Areas: `sign`, `verify`, `chain`, `types`, `canonical`, `did-key`, `envelope`, `conformance`, `examples`, `spec`, `scope`, etc. Examples in `git log`.

## Spec discipline (the one rule that cannot be relaxed)

Every code change is **exactly one** of:

1. **A refinement of [SPEC.md](./SPEC.md)** — you found a spec bug or gap. Open an issue first; spec changes need maintainer agreement before code lands.
2. **Bringing the implementation in line with the SPEC.** Tests prove the implementation matches the spec.

If you can't say which of those your change is, do not commit.

**Never** change code to pass a test that contradicts the spec. Fix the spec first (with approval), then the code. The conformance vectors in [`conformance/`](./conformance/) are part of the spec — treat them the same way.

## Adding a conformance vector

1. Compute the deterministic DID strings + canonical SHA via the helper:
   ```bash
   bun run scripts/gen-vectors.ts
   ```
2. Drop the JSON file under `conformance/vectors/c<N>-<name>/<vector-name>.json`. The shape is documented in [`conformance/README.md`](./conformance/README.md).
3. Run the suite — `bun run conformance` should print `<n>/<n> passed`.

Vectors are language-agnostic. A Rust or Go implementation should drop in here unchanged.

## Architecture rules

- **Flat `src/`.** No `src/lib/`, `src/utils/`, `src/core/`. If you find yourself wanting a subdirectory, the file probably does two things — split the file, not the folder.
- **No file over 200 lines** without a structural justification. The current largest is `src/verify.ts` at ~104.
- **No abstractions without two concrete callers today.** No `BaseHelperImpl`, no `IFooStrategy`. Plain functions are fine.
- **No defensive code for impossible paths.** If a function is only ever called with validated input, do not re-validate.
- **Public API gets a one-line docstring.** Internals get none. Comments explain *why*, not *what*.

## Style

Biome handles everything. If `bun run check` is clean, you're good. Don't argue with the formatter.

## Pull requests

- Branch off `main`. Keep PRs focused — one feature or fix per PR.
- Include a test for any new behaviour and a conformance vector for any new SPEC clause.
- CI must be green before review.
- The maintainer will run [`code-review:code-review`](https://github.com/your-org/agent-toolprint/blob/main/.github/) (or equivalent) before merging.

## Reporting bugs / suggesting features

- **Bug**: open an issue with a minimal reproducer (a failing test against `main` is best).
- **Feature**: check [SCOPE.md](./SCOPE.md) DEFERRED list and [ROADMAP.md](./ROADMAP.md) first. If the feature is already deferred, explain the trigger your use case fires.
- **Spec bug**: same — issue first, then a PR that updates `SPEC.md` and the relevant conformance vector(s) together.

## Licensing

By submitting a contribution, you agree it ships under the project's [Apache 2.0](./LICENSE) license.
