// ###########################################################################
// # Hook useTextSize — Acces facile au scaling de texte
// # Usage: const { size, scale, getScaled } = useTextSize();
// #        style={{ fontSize: getScaled(16) }}
// ###########################################################################

import { useTextSizeStore } from "@/store/textSizeStore";

export function useTextSize() {
  const size = useTextSizeStore((s) => s.size);
  const scale = useTextSizeStore((s) => s.scale);
  const getScaled = useTextSizeStore((s) => s.getScaled);

  return { size, scale, getScaled };
}
