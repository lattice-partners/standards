# adopt-overlay

Brownfield adoption is driven by the CLI, not by copying files from here:

```bash
npx github:lattice-partners/standards#v0.3.0 adopt .
```

`lattice adopt` is non-destructive. It vendors the standard into `.lattice/`,
injects a marked `<!-- lattice:standards -->` block into the existing
`AGENTS.md` (creating one if absent), and leaves all other repo files and
config untouched. Stack config and CI are not imposed on a client repo; adopt
them selectively if the engagement calls for it.
