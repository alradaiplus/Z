import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import type { SuggestionProps } from "@tiptap/suggestion";
import { FileText, Plus } from "lucide-react";
import type { SuggestionListRef } from "./suggestion/renderer";

export type WikiLinkItem = {
  id: string;
  label: string;
  icon: string | null;
  isNew: boolean;
};

export const WikiLinkMenu = forwardRef<
  SuggestionListRef,
  SuggestionProps<WikiLinkItem>
>((props, ref) => {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (props.items.length === 0) return false;
      if (event.key === "ArrowUp") {
        setSelected((s) => (s + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = props.items[selected];
        if (item) props.command(item);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="suggestion-menu">
        <div className="suggestion-item text-muted">Type a page name…</div>
      </div>
    );
  }

  return (
    <div className="suggestion-menu">
      {props.items.map((item, i) => (
        <button
          key={item.id}
          data-selected={i === selected}
          className="suggestion-item"
          onMouseEnter={() => setSelected(i)}
          onClick={() => props.command(item)}
        >
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
            {item.isNew ? (
              <Plus size={15} />
            ) : item.icon ? (
              <span>{item.icon}</span>
            ) : (
              <FileText size={15} className="text-muted" />
            )}
          </span>
          {item.isNew ? (
            <span>
              Create <span className="font-medium">{item.label}</span>
            </span>
          ) : (
            <span className="font-medium">{item.label || "Untitled"}</span>
          )}
        </button>
      ))}
    </div>
  );
});

WikiLinkMenu.displayName = "WikiLinkMenu";
