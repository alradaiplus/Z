import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";

// Shared lowlight registry — `common` covers the popular languages (js, ts,
// python, json, bash, html, css, etc.) without pulling in all of highlight.js.
const lowlight = createLowlight(common);

export const CodeBlock = CodeBlockLowlight.configure({
  lowlight,
  HTMLAttributes: { class: "hljs" },
});
