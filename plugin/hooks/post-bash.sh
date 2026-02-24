#!/bin/bash
# Nudge the agent to play music after notable Bash outcomes.
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
    nudge "Tests failed. Maybe some dark or moody music to match the debugging mood."
  else
    nudge "Tests passed! Consider celebrating with something upbeat."
  fi
fi

# Build commands
if echo "$COMMAND" | grep -qiE '(npm run build|cargo build|go build|make build|tsc|webpack|vite build|next build)'; then
  nudge "Build succeeded! Maybe play something to mark the milestone."
fi

# Deploy / publish / push
if echo "$COMMAND" | grep -qiE '(npm publish|docker push|git push|deploy)'; then
  nudge "Ship it! This calls for something epic."
fi

exit 0
