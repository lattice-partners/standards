# Changelog

## 0.9.0

Signal loop: harvest meetings, Slack, mail, GitHub, and the tracker before
planning product work. Adds `/harvest`, `/intake`, `/capture`, granola-engineer
and signal-operator agents, `Weave.md` project overrides, and optional plugin
harvest variables. ADR-0014.

## 0.8.0

First Weave release. Generated rules from the Lattice portable core and stack
baseline, workflow skills and slash commands, focused agents, and Cursor
hooks that deny dangerous shell actions and secret-file reads. Ships with
ADR-0012 (agents may commit and push, no AI attribution) and ADR-0013
(hybrid CLI plus plugin distribution).
