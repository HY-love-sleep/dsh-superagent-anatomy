#!/usr/bin/env sh
# Install this repo's git hooks into the hooks directory Git actually uses.
#
# Hooks are not committed, so every fresh clone needs this once:
#   sh scripts/install-hooks.sh
#
# The hook runs scripts/check_links.py before a commit is created and refuses
# the commit when a relative link does not resolve or an upstream citation is
# not pinned to a commit sha.
set -eu

root=$(git rev-parse --show-toplevel)
# --git-path also resolves linked worktrees and submodules, where .git is a
# file and the real hooks live outside this working tree.
hooks=$(git rev-parse --path-format=absolute --git-path hooks)
mkdir -p "$hooks"

cat > "$hooks/pre-commit" <<'HOOK'
#!/usr/bin/env sh
# Managed by scripts/install-hooks.sh — delete and re-run that script to refresh.
# Bypass with: git commit --no-verify
set -eu
root=$(git rev-parse --show-toplevel)
if command -v python3 >/dev/null 2>&1; then
    exec python3 "$root/scripts/check_links.py"
fi
echo "pre-commit: python3 not found — link check skipped" >&2
exit 0
HOOK

chmod +x "$hooks/pre-commit"
echo "installed: $hooks/pre-commit"
echo "verify with: sh scripts/install-hooks.sh && git commit --allow-empty -m test"
