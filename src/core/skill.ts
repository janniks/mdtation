/** `mdtation skill`: a short SKILL.md for agents. Describes the verbs; how to use them is the harness's call. */
export const SKILL = `---
name: mdtation
description: Read and answer a human's inline comments on a markdown file.
---

# mdtation

A terminal markdown viewer where the human leaves comments on lines.
Comments live in a json file per document; these verbs read and write it.

\`\`\`sh
mdtation <file> list [--json] [--since last|<mark>|<iso>] [--archived] [--archive]
mdtation <file> read [--json]           # the file with each comment inlined as <c id by re at>…</c>
mdtation <file> add "text" --line N      # comment on a 1-based line (as the agent)
mdtation <file> add "text" --re <id>     # reply in a thread
mdtation <file> edit <id> "text"
mdtation <file> mark [name]              # checkpoint: list --since last starts here next time
mdtation <file> archive|restore <id…>
mdtation <file> watch [--json]           # block; print comments by others as they land
mdtation <file> status
\`\`\`

- \`list\` prints markdown blocks (\`Line N\`, the quoted text, \`> note\`); \`--json\` prints one comment per line.
- Ids are stable; quote them back into \`add --re\` or \`archive\`.
- The human's viewer follows the json, so \`add\` shows up inline for them at once.
- \`$MDTATION_AUTHOR\` names the agent (default \`agent\`).
`;
