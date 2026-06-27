import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { SuggestionListRef } from "./suggestion/renderer";
import type { SlashItem } from "./extensions/SlashCommand";

export const SlashMenu = forwardRef<
  SuggestionListRef,
  SuggestionProps<SlashItem>
>((props, ref) => {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
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
        <div className="suggestion-item text-muted">No matching blocks</div>
      </div>
    );
  }

  return (
    <div className="suggestion-menu">
      {props.items.map((item, i) => (
        <button
          key={item.title}
          data-selected={i === selected}
          className="suggestion-item"
          onMouseEnter={() => setSelected(i)}
          onClick={() => props.command(item)}
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-border bg-surface">
            {item.icon}
          </span>
          <span className="flex flex-col">
            <span className="font-medium">{item.title}</span>
            <span className="desc">{item.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
});

SlashMenu.displayName = "SlashMenu";
