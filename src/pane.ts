import { BindingParams, Pane } from "tweakpane";
import ky from "ky";

interface Data {
  name: string;
  value: unknown;
  cType: string;
}

async function waitUntilAvailable(): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      await ky.get("http://localhost:8080/"); // calling here separately because setInterval will call the callback on every 150ms but it doesn't call it on zeroth ms
      return resolve(true);
    } catch {}

    const intervalId = setInterval(async () => {
      try {
        await ky.get("http://localhost:8080/");
        console.clear();
        clearInterval(intervalId);
        return resolve(true);
      } catch (err) {
        console.log("Ctrl server not available. Retrying...");
      }
    }, 450);
  });
}

function getParsedNumberOrUndefined(
  str: string,
  cType: string
): number | undefined {
  switch (cType) {
    case "int": {
      const val = parseInt(str, 10);
      if (isNaN(val)) return undefined;
      return val;
    }
    case "float": {
      const val = parseFloat(str);
      if (isNaN(val)) return undefined;
      return val;
    }
  }
  return undefined;
}

/*
  Name can just be label (which can have space), but can also be:
  - `tick rate;.10,.60,.5`  (name;min,max,steps)
  - `tick rate;.10,.60`     (name;min,max)
  - `speed;1,10`
  - `sine;view`              (name;view) < read-only
  - `sine;graph`
  - `sine;graph,-1,1`        (name;graph,min,max)
  - `food time;morning,evening,night`           (string and its dropdown options)
  - `month;April:APR,February:FEB,March:MAR`    (string and its dropdown options where the labels are different from their values)
*/
function getParams(name: string, cType: string): BindingParams {
  switch (cType) {
    case "int":
    case "float": {
      const params: BindingParams = {};
      const nameSplits = name.split(";");
      params.label = nameSplits[0];
      const args = nameSplits[1];
      if (args) {
        const argsSplits = args.split(",");
        switch (argsSplits[0]) {
          case "view":
          case "readonly":
            // @ts-expect-error true is not assignable for some reason
            params.readonly = true;
            break;
          case "graph":
            // @ts-expect-error true is not assignable for some reason
            params.readonly = true;
            params.view = "graph";
            params.min = getParsedNumberOrUndefined(argsSplits[1], cType);
            params.max = getParsedNumberOrUndefined(argsSplits[2], cType);
            break;
          default:
            params.min = getParsedNumberOrUndefined(argsSplits[0], cType);
            params.max = getParsedNumberOrUndefined(argsSplits[1], cType);
            params.step = getParsedNumberOrUndefined(argsSplits[2], cType);
        }
      }
      return params;
    }
    case "string": {
      const params: BindingParams = {};
      const nameSplits = name.split(";");
      params.label = nameSplits[0];
      const args = nameSplits[1];
      if (args) {
        const argsSplits = args.split(",");
        const isKeyVal = argsSplits.every((v) => v.includes(":"));
        if (isKeyVal) {
          const map: Record<string, string> = {};
          argsSplits.forEach((v) => {
            const [key, val] = v.split(":");
            map[key] = val;
          });
          params.options = map;
        } else {
          params.options = argsSplits;
        }
      }
      return params;
    }
    default:
      return { label: name };
  }
}

async function main() {
  await waitUntilAvailable();

  let pane = new Pane();

  const sse = new EventSource("http://localhost:8080/events?stream=messages");

  const handleMessage = ({ data: dataStr }: { data: string }) => {
    if (dataStr === "hello") return;

    const data: Data = JSON.parse(dataStr);
    const params = getParams(data.name, data.cType);
    const binding = pane.addBinding(data, "value", params);

    function onChange(ev: { value: unknown }) {
      ky.post("http://localhost:8080/set", {
        json: { name: data.name, value: ev.value, cType: data.cType },
      });
    }
    binding.on("change", onChange);
    // no need to dispose handler as I'm calling pane.dispose() upon SSE close
  };
  sse.addEventListener("message", handleMessage);

  sse.addEventListener("error", () => {
    pane.dispose();
    sse.removeEventListener("message", handleMessage);
    sse.close();
    main();
  });
}

main();
