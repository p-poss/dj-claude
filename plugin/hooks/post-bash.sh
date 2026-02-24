#!/bin/bash
# Nudge the agent to react musically after notable Bash outcomes.
# Reads PostToolUse JSON from stdin via jq. Falls back silently if jq is missing.

command -v jq >/dev/null 2>&1 || exit 0

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)
OUTPUT=$(echo "$INPUT" | jq -r '.tool_output // ""' 2>/dev/null)

nudge() {
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"$1\"}}"
  exit 0
}

# Test commands
if echo "$COMMAND" | grep -qiE '(npm test|npx vitest|npx jest|pytest|jest |vitest |cargo test|go test|make test|rspec|mocha)'; then
  if echo "$OUTPUT" | grep -qiE '(fail|error|FAIL|ERROR)'; then
    nudge "Tests failed. Set context to 'debugging test failures' with mcp__dj-claude__set_context, then set the mood — try mcp__dj-claude__set_vibe with 'dark' or 'focus', or write your own moody Strudel code via mcp__dj-claude__play_strudel."
  else
    nudge "Tests passed! Set context to 'tests passing' with mcp__dj-claude__set_context, then celebrate — try mcp__dj-claude__set_vibe with 'hype', or write celebratory Strudel code via mcp__dj-claude__play_strudel."
  fi
fi

# Build commands
if echo "$COMMAND" | grep -qiE '(npm run build|cargo build|go build|make build|tsc|webpack|vite build|next build)'; then
  nudge "Build succeeded! Set context to 'successful build' with mcp__dj-claude__set_context, then celebrate with mcp__dj-claude__set_vibe 'epic' or write your own triumphant Strudel code."
fi

# Deploy / publish / push
if echo "$COMMAND" | grep -qiE '(npm publish|docker push|git push|deploy)'; then
  nudge "Ship it! Set context to 'deploying' with mcp__dj-claude__set_context, then mark the moment with mcp__dj-claude__set_vibe 'epic' or compose something grand via mcp__dj-claude__play_strudel."
fi

exit 0
