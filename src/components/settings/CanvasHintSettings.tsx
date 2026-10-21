import { useState } from "react";
import { HINT_TEXT as text } from "../../i18n/canvas-hints.zh-CN";
import { useCanvasHintStore, validHintLimit } from "../../store/useCanvasHintStore";
import { INTERACTION_MODE_HELP } from "../canvas/types";

export function CanvasHintSettings() {
  const settings = useCanvasHintStore();
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-slate-400">{text.limitHelp}</p>
      {(["operationLimit", "labelLimit"] as const).map((key) => (
        <LimitInput
          key={key}
          label={text[key]}
          value={settings[key]}
          onChange={(value) => settings.setLimit(key, value)}
        />
      ))}
      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer">{text.fullHelp}</summary>
        {Object.values(INTERACTION_MODE_HELP).map((help) => (
          <div key={help.title} className="mt-2">
            <strong>{help.title}</strong>
            {help.tips.map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </div>
        ))}
      </details>
    </div>
  );
}

function LimitInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const valid = draft.trim() !== "" && validHintLimit(Number(draft));
  return (
    <label className="block text-sm text-slate-300">
      <span>{label}</span>
      <input
        type="number"
        min={1}
        max={50}
        step={1}
        aria-label={label}
        aria-invalid={!valid}
        className="ml-3 w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (event.target.value.trim() && validHintLimit(Number(event.target.value)))
            onChange(Number(event.target.value));
        }}
      />
      {!valid && (
        <span role="alert" className="ml-2 text-xs text-amber-300">
          {text.invalidLimit}
        </span>
      )}
    </label>
  );
}
