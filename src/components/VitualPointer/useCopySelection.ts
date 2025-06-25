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

export function useCopySelection(): UseCopySelectionReturn {
  const selectionRef = useRef<Range | null>(null);
  const anchorNodeRef = useRef<Text | null>(null);
  const anchorOffsetRef = useRef<number>(0);
  const [isCopyMode, setIsCopyMode] = useState(false);

  /**
   * コピー選択開始 (Ctrl+Q)
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
    // ポインタ移動用コールバックを呼ぶ
    setPosition({ x: rect.left - /* pointerSize/2 は呼び出し側で調整 */ 0, y: rect.bottom - /* pointerSize/2 */ 0 });
    selectionRef.current = range;
    anchorNodeRef.current = node;
    anchorOffsetRef.current = offset;
    setIsCopyMode(true);
  };

  /**
   * コピー範囲を拡大/縮小 (h/l)
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
    // ポインタ移動
    const rangeForEnd = document.createRange();
    rangeForEnd.setStart(endNode, endOffset);
    rangeForEnd.setEnd(endNode, endOffset);
    const rect = rangeForEnd.getBoundingClientRect();
    setPosition({ x: rect.left - /* pointerSize/2 */ 0, y: rect.bottom - /* pointerSize/2 */ 0 });
  };

  /**
   * コピー選択解除 (Escape 等)
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
