const REVEAL_MARGIN = 16;

interface RevealParams {
  fieldTop: number;
  fieldHeight: number;
  scrollOffset: number;
  visibleHeight: number;
  margin?: number;
}

export function scrollOffsetToReveal({
  fieldTop,
  fieldHeight,
  scrollOffset,
  visibleHeight,
  margin = REVEAL_MARGIN,
}: RevealParams): number | null {
  if (visibleHeight <= 0) return null;

  const top = fieldTop - margin;
  const bottom = fieldTop + fieldHeight + margin;

  let next = scrollOffset;
  if (bottom > next + visibleHeight) next = bottom - visibleHeight;
  if (top < next) next = top;
  next = Math.max(0, next);

  return Math.abs(next - scrollOffset) < 1 ? null : next;
}
