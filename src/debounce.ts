// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<F extends (...arguments_: any) => any>(
  function_: F,
  wait = 200
): F {
  let timeoutID: number;

  return function (this: unknown, ...arguments_: Parameters<F>) {
    clearTimeout(timeoutID);

    timeoutID = window.setTimeout(() => {
      function_.apply(this, arguments_);
    }, wait);
  } as F;
}

export default debounce;
