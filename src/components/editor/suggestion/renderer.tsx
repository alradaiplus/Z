import { ReactRenderer } from "@tiptap/react";
import type {
  SuggestionOptions,
  SuggestionProps,
  SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import type { ElementType } from "react";

// A suggestion-list component exposes an imperative onKeyDown so the popup can
// handle arrow/enter navigation while the editor keeps focus.
export type SuggestionListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

/**
 * Build the `render` half of a TipTap Suggestion config: mounts a React list
 * component in a fixed-position popup anchored to the caret, and forwards key
 * events to it.
 */
export function createSuggestionRenderer<I>(
  Component: ElementType,
): SuggestionOptions<I>["render"] {
  return () => {
    let renderer: ReactRenderer<SuggestionListRef>;
    let popup: HTMLDivElement;

    const position = (props: SuggestionProps<I>) => {
      const rect = props.clientRect?.();
      if (!rect || !popup) return;
      popup.style.left = `${rect.left}px`;
      // Place below the caret, flipping above when near the viewport bottom.
      const below = rect.bottom + 8;
      const wouldOverflow = below + 320 > window.innerHeight;
      if (wouldOverflow) {
        popup.style.top = "";
        popup.style.bottom = `${window.innerHeight - rect.top + 8}px`;
      } else {
        popup.style.bottom = "";
        popup.style.top = `${below}px`;
      }
    };

    return {
      onStart: (props) => {
        renderer = new ReactRenderer(Component, {
          props,
          editor: props.editor,
        });
        popup = document.createElement("div");
        popup.style.position = "fixed";
        popup.style.zIndex = "50";
        popup.appendChild(renderer.element);
        document.body.appendChild(popup);
        position(props);
      },
      onUpdate: (props) => {
        renderer.updateProps(props);
        position(props);
      },
      onKeyDown: (props) => {
        if (props.event.key === "Escape") {
          popup.remove();
          renderer.destroy();
          return true;
        }
        return renderer.ref?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        popup?.remove();
        renderer?.destroy();
      },
    };
  };
}
