# Changelog

## 1.1.2

`/setup-weave` uses AskQuestion, one field per turn. Each question observes
what is already in the repo or Weave.md and asks keep or edit.

## 1.1.1

`/setup-weave` interviews for every `weave.md` field (repo type, each
opt-out, notes including boot / prove / proof) and writes only after
confirmation.

## 1.1.0

Replace always-on `.mdc` rules with `principle-*` skills (`alwaysApply: true`).
Remove the plugin `rules` bundle.

## 1.0.0

Weave-only repo. Remove CLI, core, stack, templates, hooks, and docs. Policy
lives in hand-authored plugin rules and skills. Per-project config via
`weave.md` and `/setup-weave`.

## 0.11.0

Restructure around hand-authored rules, three skills, two commands, and
`templates/weave.md` for opt-outs.

## 0.10.0

Remove Weave Cursor hooks and their scripts.

## 0.9.0

Remove Weave subagents.

## 0.8.0

First Weave release.
