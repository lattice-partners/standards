# Weave

Approved project configuration for the Weave Cursor plugin. Change this file
only through `/setup-weave` or after explicit human approval. Put repository
commands, architecture, and reusable corrections in `AGENTS.md`.

## Configuration

```yaml
weave_version: <installed plugin version>
components:
  <name>:
    path: <repository-relative path>
    language: <language or not applicable>
    framework: <framework or not applicable>
    hosting: <hosting platform or not applicable>
    lattice:
      design: false
      stack: false
```

List only components needed to scope these settings. Use `path: .` for a
single-component repository. Set both Lattice flags explicitly for every
component. A `true` flag enables the corresponding Lattice skill when relevant;
`false` disables it for that component.

## Approved exceptions and notes

- None.

Record only approved exceptions to this configuration or facts needed to
interpret it. Do not put workflow rules or general repository instructions
here.
