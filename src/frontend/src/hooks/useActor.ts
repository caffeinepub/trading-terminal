import { useActor as useCaffeineActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";

export function useActor() {
  return useCaffeineActor(createActor);
}
