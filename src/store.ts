import { signal } from "@preact/signals";

export const forceUpdateKey = signal({});

export const forceUpdate = () => {
  forceUpdateKey.value = {};
};
