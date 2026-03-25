type Job<T> = () => Promise<T>;

let chain: Promise<unknown> = Promise.resolve();

export const enqueueEvaluation = <T>(job: Job<T>): Promise<T> => {
  let resolveFn: (value: T | PromiseLike<T>) => void;
  let rejectFn: (reason?: unknown) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  chain = chain
    .then(() => job().then(resolveFn!, rejectFn!))
    .catch((error) => {
      console.error("Evaluation queue job failed", error);
    });

  return promise;
};
