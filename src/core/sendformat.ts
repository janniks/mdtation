import { resolveAnchor } from "./comment.ts";
import type { Comment } from "./comment.ts";
import type { Document } from "./document.ts";

export function sendFormat(comment: Comment, doc: Document): string {
  const loc = resolveAnchor(comment.anchor, doc);
  const payload = {
    type: "mdtation/comment",
    line: loc ? loc.startLine : null,
    anchor: comment.anchor,
    text: comment.text,
  };
  return JSON.stringify(payload) + "\n> " + comment.text;
}
