# Contract versioning policy

- OpenAPI uses semantic versioning in `info.version`.
- Event and export schemas carry an explicit `schemaVersion`.
- Additive, optional fields are backward-compatible minor changes.
- Removing, renaming, changing meaning, or making an optional field required is a major change.
- Consumers must ignore unknown optional fields and reject unsupported major versions.
- Every schema change requires a fixture, compatibility test, owner, and migration note.
