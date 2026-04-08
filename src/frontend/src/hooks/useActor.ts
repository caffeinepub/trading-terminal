// Stub useActor hook — backend canister has no trade methods yet,
// so actor is always null and isFetching is always false.
export function useActor() {
  return { actor: null as null, isFetching: false };
}
