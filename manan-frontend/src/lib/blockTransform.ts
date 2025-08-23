/* src/lib/blocknoteTransform.ts */
import type { Block as EditorBlock } from "@blocknote/core";
import type { Block as DbBlock }     from "../types";



export interface UpdateBlockInput {
  pageId: string;
  type: string;
  content: any;
  properties: any;
  position: number;
  metadata: JSON | null;
  parentId: string | null;
  version: number;

}

export function fromBlockNote(
  blk: EditorBlock, pageId: string
): { id: string; data: UpdateBlockInput } {
  /* ①  Build the map inside the function */
  const map: Record<EditorBlock["type"], UpdateBlockInput["type"]> = {
    paragraph:        "TEXT",
    heading:          "HEADING",
    codeBlock:        "CODE",
    checkListItem:    "TODO",
    bulletListItem:   "BULLETED_LIST",
    numberedListItem: "NUMBERED_LIST",
    quote:            "QUOTE",
    divider:          "DIVIDER",
    image:            "IMAGE",
    table:            "TABLE",
    file:             "EMBED"
  };

  /* ②  Normalise content for text-like blocks */
 let content;
  if (blk.type === "paragraph" || blk.type === "heading") {
    const textNode = blk.content?.[0];
    content = textNode?.text || "";
  } else {
    content = blk.content || "";
  }

  return {
    id: blk.id,
    data: {
      pageId: pageId,           // ✅ Now pageId is provided
      type: map[blk.type] || "TEXT",
      content: content,
      properties: blk.props || {},
      position: 0,
      metadata: null,
      parentId: null,
      version: 1
    }
  };
}




const map: Record<DbBlock["type"], EditorBlock["type"]> = {
  TEXT:           "paragraph",
  HEADING:        "heading",
  CODE:           "codeBlock",
  TODO:           "checkListItem",
  CHECKLIST:      "checkListItem",
  BULLETED_LIST:  "bulletListItem",
  NUMBERED_LIST:  "numberedListItem",
  QUOTE:          "quote",
  DIVIDER:        "divider",
  IMAGE:          "image",
  TABLE:          "table",
  EMBED:          "file"
};

export function toBlockNote(row: DbBlock): EditorBlock | null {
  const type = map[row.type];
  if (!type) return null;                         // unknown enum → skip

  // --- fix content shape ---------------------------------------
  let content: EditorBlock["content"];
  if (type === "paragraph" || type === "heading") {
    const txt = typeof row.content === "string"
      ? row.content
      : (row.content?.text ?? "");
    content = [{ type: "text", text: txt, styles: {} }];
  } else {
    content = Array.isArray(row.content) ? row.content : [];
  }

  // --- fix props ----------------------------------------------
  const props =
    type === "codeBlock"
      ? { language: row.properties?.language ?? "txt" }
      : (row.properties ?? {});

  return { id: row.id, type, content, props, children: [] };
}
