#!/bin/bash
# Reports notable Bash outcomes so DJ Claude can respond if the user has music playing.
# Reads PostToolUse JSON from stdin via jq. Falls back silently if jq is missing.

command -v jq >/dev/null 2>&1 || exit 0

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)
OUTPUT=$(echo "$INPUT" | jq -r '.tool_output // ""' 2>/dev/null)

report() {
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"$1\"}}"
  exit 0
}

# Test commands
if echo "$COMMAND" | grep -qiE '(npm test|npx vitest|npx jest|pytest|jest |vitest |cargo test|go test|make test|rspec|mocha)'; then
  if echo "$OUTPUT" | grep -qiE '(fail|error|FAIL|ERROR)'; then
    report "Tests failed. If the user has music playing, mcp__dj-claude__set_context can be updated to 'debugging test failures'."
  else
    report "Tests passed. If the user has music playing, mcp__dj-claude__set_context can be updated to 'tests passing'."
  fi
fi

# Build commands
if echo "$COMMAND" | grep -qiE '(npm run build|cargo build|go build|make build|tsc|webpack|vite build|next build)'; then
  report "Build succeeded. If the user has music playing, mcp__dj-claude__set_context can be updated to 'successful build'."
fi

# Deploy / publish / push
if echo "$COMMAND" | grep -qiE '(npm publish|docker push|git push|deploy)'; then
  report "Deploy detected. If the user has music playing, mcp__dj-claude__set_context can be updated to 'deploying'."
fi

exit 0
