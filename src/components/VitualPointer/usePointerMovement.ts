import { useCallback } from 'react';
import { dispatchMouseEvent } from '../../utils/domEvents';
import type { PointerPosition } from '../../types/KeyboardPointer';

/**
 * usePointerMovement: ポインタ移動ロジック
 * - positionRef: 最新の position を保持する ref（必要に応じて外部で管理）
 * - move 関数: dx, dy による移動と mousemove イベント発行
 */
export function usePointerMovement(
  pointerSize: number,
  margin: number,
  positionRef: React.MutableRefObject<PointerPosition>,
  setPosition: (pos: PointerPosition) => void
) {
  /**
   * move: dx, dy 分移動し、mousemove 発行
   */
  const move = useCallback((dx: number, dy: number) => {
    const prev = positionRef.current;
    const newX = Math.max(0, Math.min(window.innerWidth - pointerSize - margin, prev.x + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - pointerSize - margin, prev.y + dy));
    // mousemove 発行
    dispatchMouseEvent('mousemove', newX + pointerSize / 2, newY + pointerSize / 2);
    const newPos = { x: newX, y: newY };
    positionRef.current = newPos;
    setPosition(newPos);
  }, [pointerSize, margin, positionRef, setPosition]);

  return { move };
}
