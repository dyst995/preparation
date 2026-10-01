import { useEffect, useMemo, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { loadProgress, saveProgress } from "./lib.js";

function ProgressBox({ storageKey, index, checked: initial }) {
  const ref = useRef(null);
  const saved = loadProgress()[storageKey]?.[index];
  const checked = saved ?? initial ?? false;

  useEffect(() => {
    ref.current?.closest("li")?.classList.toggle("done", checked);
  }, [checked]);

  function onChange(e) {
    const next = loadProgress();
    next[storageKey] = next[storageKey] || {};
    next[storageKey][index] = e.target.checked;
    saveProgress(next);
    e.target.closest("li")?.classList.toggle("done", e.target.checked);
  }

  return (
    <input
      ref={ref}
      type="checkbox"
      defaultChecked={checked}
      onChange={onChange}
    />
  );
}

export default function MarkdownView({ text, storageKey }) {
  const counter = useRef(0);
  counter.current = 0;

  const components = useMemo(() => {
    return {
      input({ type, checked, ...props }) {
        if (type !== "checkbox" || !storageKey) {
          return <input type={type} checked={checked} disabled {...props} />;
        }
        const index = counter.current++;
        return (
          <ProgressBox
            storageKey={storageKey}
            index={index}
            checked={checked}
          />
        );
      },
    };
  }, [storageKey, text]);

  return (
    <div className="md">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </Markdown>
    </div>
  );
}
