# Changelog

## 0.10.0

Remove Weave Cursor hooks and their scripts. Git hooks and vendored agent
safety rules remain the enforcement layer.

## 0.9.0

Remove Weave subagents. Review, verification, and security checks stay in
skills and slash commands.

## 0.8.0

First Weave release. Generated rules from the Lattice portable core and stack
baseline, workflow skills and slash commands, focused agents, and Cursor
hooks that deny dangerous shell actions and secret-file reads. Ships with
ADR-0012 (agents may commit and push, no AI attribution) and ADR-0013
(hybrid CLI plus plugin distribution).
