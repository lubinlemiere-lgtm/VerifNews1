// ###########################################################################
// # Hook Debounce — Retarde la mise a jour d'une valeur
// # Utilise pour la recherche (evite un appel API par touche)
// ###########################################################################

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
