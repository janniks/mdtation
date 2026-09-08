/** `mdtation skill`: a short SKILL.md for agents. Describes the verbs; how to use them is the harness's call. */
export const SKILL = `---
name: mdtation
description: Read and answer a human's inline comments on a markdown file.
---

# mdtation

A terminal markdown viewer where the human leaves comments on lines.
Comments live in a json file per document; these verbs read and write it.

The loop: write the file, \`watch\` it, the human comments, you reply with \`add --re\` or rewrite the file, the human quits.
\`watch --until quit\` returns when the viewer closes; without it, \`watch\` never exits.
The viewer reloads on every change, so a rewrite or a reply shows up for them at once.

\`\`\`sh
mdtation <file> list [--json] [--since last|<mark>|<iso>] [--archived] [--archive]
mdtation <file> read [--json]           # the file with each comment inlined as <c id by re at>…</c>
mdtation <file> add "text" --line N      # comment on a 1-based line (as the agent)
mdtation <file> add "text" --re <id>     # reply in a thread
mdtation <file> edit <id> "text"
mdtation <file> mark [name]              # checkpoint: list --since last starts here next time
mdtation <file> archive|restore <id…>
mdtation <file> expire [--older 1d|7d|30d|1y]  # remove archived comments for good (default: retention setting)
mdtation <file> watch [--json] [--until comment|open|quit] [--since last|<mark>|<iso>]
                                         # block; print comments by others as they land (open/quit as one line each)
mdtation <file> status
\`\`\`

- \`list\` prints markdown blocks (\`Line N\`, the quoted text, \`> note\`); \`--json\` prints one comment per line.
- Ids are stable; quote them back into \`add --re\` or \`archive\`.
- The human's viewer follows the json, so \`add\` shows up inline for them at once.
- \`$MDTATION_AUTHOR\` names the agent (default \`agent\`); set it so replies read as a conversation.
`;
