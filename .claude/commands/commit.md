---
description: Commit current changes with a descriptive message
argument-hint: "[commit message]"
allowed-tools:
  - Bash
---

Review the current git status and staged/unstaged changes, then commit with the provided message. If no message is provided, generate an appropriate commit message based on the changes.

Arguments: $ARGUMENTS

Steps:
1. Check git status to see what changes exist
2. Review staged and unstaged changes with git diff
3. Add relevant files to staging if needed
4. Create a commit with the provided message or generate one based on changes
5. Show the final commit details