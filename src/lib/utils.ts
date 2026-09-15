import { clsx, type ClassValue } from "clsx";

/** Fusionne des classes conditionnelles (wrapper fin autour de clsx). */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
