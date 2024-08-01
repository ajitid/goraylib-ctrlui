import { render } from "preact";
import { html } from "htm/preact";
import { useMemo, useState } from "preact/hooks";

import "./style.css";

import { forceUpdate, forceUpdateKey } from "./store";
import { currentPane } from "./pane";

const App = () => {
  const [isTableVisible, setIsTableVisible] = useState(false);

  const table = useMemo(() => {
    const d = localStorage.getItem("tweaked-params") ?? "";
    const p: Array<{ time: number; tweakedParams: Record<string, unknown> }> = d
      ? JSON.parse(d)
      : [];
    return p.reverse();
  }, [forceUpdateKey.value]);

  const clearHistory = () => {
    localStorage.removeItem("tweaked-params");
    forceUpdate();
  };

  const tableContents = table
    .map(({ time, tweakedParams }, i) => {
      const entries = [];
      for (let key of Object.keys(tweakedParams)) {
        entries.push(html`
          <tr
            style="background-color: ${time === currentPane.time
              ? "#2f3130"
              : "unset"}"
          >
            <td>${key}</td>
            <td>${tweakedParams[key]}</td>
          </tr>
        `);
      }

      if (i !== table.length - 1) {
        entries.push(html`
          <tr>
            <td>---</td>
            <td>---</td>
          </tr>
        `);
      }

      return entries;
    })
    .flat();

  const tableEl = html`
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${tableContents}
      </tbody>
    </table>
  `;

  return html`
    <div>
      <button onClick=${() => setIsTableVisible((v) => !v)} class="mr-3">
        ${isTableVisible ? "Hide History" : "Show History"}
      </button>
      <button onClick=${() => clearHistory()}>Clear history</button>
      <div>${isTableVisible && tableEl}</div>
    </div>
  `;
};

render(html`<${App} />`, document.body);
