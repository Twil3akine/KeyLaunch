import { useCallback } from 'react';
import { dispatchMouseEvent } from '../../utils/domEvents';
import type { PointerPosition } from '../../types/VirtualPointer';

/**
 * usePointerMovement: ポインタ移動ロジック
 * - positionRef: 最新の position を保持する ref（必要に応じて外部で管理）
 * - move 関数: dx, dy による移動と mousemove イベント発行
 * 
 * 画面内の仮想ポインタ位置を dx, dy だけ動かす。windowサイズとポインタサイズ・マージンで制限をかける。
 * マウスのmousemoveイベントを擬似的に発火し
 */
export function usePointerMovement(
  pointerSize: number,
  margin: number,
  positionRef: React.MutableRefObject<PointerPosition>,
  setPosition: (pos: PointerPosition) => void
) {
  /**
   * move: dx, dy 分移動し、mousemove 発行
   * 新しい位置は画面端までの制限をかける
   * mousemoveイベントはポインタ中心で発火
   */
  const move = useCallback((dx: number, dy: number) => {
    const prev = positionRef.current;
    const newX = Math.max(0, Math.min(window.innerWidth - pointerSize - margin, prev.x + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - pointerSize - margin, prev.y + dy));
    // mousemove 発行（擬似マウス移動イベント）
    dispatchMouseEvent('mousemove', newX + pointerSize / 2, newY + pointerSize / 2);
    const newPos = { x: newX, y: newY };
    positionRef.current = newPos;
    setPosition(newPos);
  }, [pointerSize, margin, positionRef, setPosition]);

  return { move };
}
