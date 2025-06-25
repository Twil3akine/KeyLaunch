import { useRef, useState } from 'react';
import { getTextNodeAndOffsetFromPoint, getNextTextNode, getPreviousTextNode } from '../../utils/nodeProcess';
import type { PointerPosition } from '../../types/KeyboardPointer';

type UseCopySelectionReturn = {
  isCopyMode: boolean;
  startCopy: (clientX: number, clientY: number, setPosition: (pos: PointerPosition) => void) => void;
  adjustCopy: (
    direction: 'left' | 'right',
    setPosition: (pos: PointerPosition) => void
  ) => void;
  cancelCopy: () => void;
};

/**
 * useCopySelection: コピー選択範囲管理フック
 * - コピー選択の開始、範囲拡大・縮小、解除を行う
 * - ポインタの座標は選択範囲の端（文字の左下）に合わせて更新
 */
export function useCopySelection(): UseCopySelectionReturn {
  const selectionRef = useRef<Range | null>(null);
  const anchorNodeRef = useRef<Text | null>(null);
  const anchorOffsetRef = useRef<number>(0);
  const [isCopyMode, setIsCopyMode] = useState(false);

  /**
   * コピー選択開始 (Alt+C)
   * clientX, clientY の位置のテキストノードとオフセットを取得し
   * 範囲を初期化。ポインタも範囲開始位置に移動。
   */
  const startCopy = (
    clientX: number,
    clientY: number,
    setPosition: (pos: PointerPosition) => void
  ) => {
    const caretInfo = getTextNodeAndOffsetFromPoint(clientX, clientY);
    if (!caretInfo) return;
    const { node, offset } = caretInfo;
    // Range 初期化
    const range = document.createRange();
    range.setStart(node, offset);
    range.setEnd(node, offset);
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
    const rect = range.getBoundingClientRect();
    setPosition({ x: rect.left, y: rect.bottom }); // - pointerSize/2 の調整は呼び出し側で行う
    selectionRef.current = range;
    anchorNodeRef.current = node;
    anchorOffsetRef.current = offset;
    setIsCopyMode(true);
  };

  /**
   * コピー範囲を左右に調整 (h/l)
   * 範囲終端のテキストノードとオフセットを更新し、範囲再設定
   * ポインタ位置も末尾に合わせて更新
   */
  const adjustCopy = (
    direction: 'left' | 'right',
    setPosition: (pos: PointerPosition) => void
  ) => {
    const selection = window.getSelection();
    const anchor = anchorNodeRef.current;
    const anchorOffset = anchorOffsetRef.current;
    if (!selection || !anchor || !(anchor instanceof Text)) return;

    let currentRange = selection.getRangeAt(0);
    let endNode = currentRange.endContainer;
    let endOffset = currentRange.endOffset;

    if (direction === 'right') {
      if (endNode instanceof Text) {
        if (endOffset < endNode.length) {
          endOffset += 1;
        } else {
          const next = getNextTextNode(endNode);
          if (next) {
            endNode = next;
            endOffset = 1;
          }
        }
      }
    }
    if (direction === 'left') {
      if (endNode instanceof Text) {
        if (endOffset > 0) {
          endOffset -= 1;
        } else {
          const prev = getPreviousTextNode(endNode);
          if (prev) {
            endNode = prev;
            endOffset = prev.length - 1;
          }
        }
      }
    }
    // Range 更新
    const newRange = document.createRange();
    newRange.setStart(anchor, anchorOffset);
    newRange.setEnd(endNode, endOffset);
    selection.removeAllRanges();
    selection.addRange(newRange);
    selectionRef.current = newRange;
    // ポインタの移動
    const rangeForEnd = document.createRange();
    rangeForEnd.setStart(endNode, endOffset);
    rangeForEnd.setEnd(endNode, endOffset);
    const rect = rangeForEnd.getBoundingClientRect();
    setPosition({ x: rect.left, y: rect.bottom }); // - pointerSize/2 の調整は呼び出し側で行う
  };

  /**
   * コピー選択解除 (Escape 等)
   * 選択範囲をクリアし、状態をリセットする
   */
  const cancelCopy = () => {
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    selectionRef.current = null;
    anchorNodeRef.current = null;
    anchorOffsetRef.current = 0;
    setIsCopyMode(false);
  };

  return {
    isCopyMode,
    startCopy,
    adjustCopy,
    cancelCopy,
  };
}
