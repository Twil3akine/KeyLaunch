// src/components/KeyboardPointer/useKeyboardPointer.ts
import { useEffect, useRef, useState } from 'react';
import type { PointerPosition } from '../../types/pointer';
import {
  getTextNodeAndOffsetFromPoint,
  getNextTextNode,
  getPreviousTextNode,
} from '../../utils/nodeProcess';

type UseKeyboardPointerOptions = {
  pointerSize: number;
  margin: number;
};

/**
 * useKeyboardPointer フック
 * - 仮想ポインタ位置 (position)
 * - フォーカス状態 (isFocusing)
 * - コピー選択モード (isCopyMode)
 * - キー入力に応じた処理 (移動、クリック、選択拡大縮小 など)
 */
export function useKeyboardPointer({
  pointerSize,
  margin,
}: UseKeyboardPointerOptions) {
  const [position, setPosition] = useState<PointerPosition>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const [isFocusing, setIsFocusing] = useState(false);
  const isFocusingRef = useRef(false);

  const [isCopyMode, setIsCopyMode] = useState(false);
  const selectionRef = useRef<Range | null>(null);
  const anchorNodeRef = useRef<Node | null>(null);
  const anchorOffsetRef = useRef<number>(0);

  // カーソル移動処理
  const move = (dx: number, dy: number) => {
    setPosition((prev) => {
      const newX = Math.max(0, Math.min(window.innerWidth - pointerSize - margin, prev.x + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - pointerSize - margin, prev.y + dy));

      const el = document.elementFromPoint(newX + pointerSize / 2, newY + pointerSize / 2);
      if (el) {
        el.dispatchEvent(
          new MouseEvent('mousemove', {
            clientX: newX + pointerSize / 2,
            clientY: newY + pointerSize / 2,
          })
        );
      }

      return { x: newX, y: newY };
    });
  };

  // キーダウンハンドラ本体
  const keydownHandler = (e: KeyboardEvent) => {
    const stepX = e.shiftKey ? window.innerWidth / 50 : window.innerWidth / 20;
    const stepY = e.shiftKey ? window.innerHeight / 50 : window.innerHeight / 20;

    const clientX = position.x + pointerSize / 2;
    const clientY = position.y + pointerSize / 2;
    const target = document.elementFromPoint(clientX, clientY);
    if (!target) return;

    // Ctrl+Q: コピー選択開始／切替
    if (e.ctrlKey && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      e.stopPropagation();
      const caretInfo = getTextNodeAndOffsetFromPoint(clientX, clientY);
      if (caretInfo) {
        const { node, offset } = caretInfo;
        const range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, offset);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
          const rect = range.getBoundingClientRect();
          setPosition({
            x: rect.left - pointerSize / 2,
            y: rect.bottom - pointerSize / 2,
          });
          selectionRef.current = range;
          anchorNodeRef.current = node;
          anchorOffsetRef.current = offset;
          setIsCopyMode(true);
        }
      }
      return;
    }

    // Escape: フォーカス／コピー解除
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      const active = document.activeElement;
      if (active && typeof (active as HTMLElement).blur === 'function') {
        (active as HTMLElement).blur();
      }
      isFocusingRef.current = false;
      setIsFocusing(false);
      setIsCopyMode(false);
      selectionRef.current = null;
      anchorNodeRef.current = null;
      if (pointerRef.current) {
        pointerRef.current.style.background = 'red';
      }
      const selectedText = window.getSelection();
      if (selectedText) selectedText.removeAllRanges();
      return;
    }

    // Copy モード中の選択拡大縮小 etc.
    if (isCopyMode && selectionRef.current && anchorNodeRef.current) {
      const selectedText = window.getSelection();
      const anchor = anchorNodeRef.current;
      const anchorOffset = anchorOffsetRef.current;
      if (!selectedText || !anchor || !(anchor instanceof Text)) return;

      let currentRange = selectedText.getRangeAt(0);
      let endNode = currentRange.endContainer;
      let endOffset = currentRange.endOffset;

      if (e.key === 'l') {
        if (endNode instanceof Text) {
          if (endOffset < endNode.length) {
            endOffset += 1;
          } else {
            const nextNode = getNextTextNode(endNode);
            if (nextNode) {
              endNode = nextNode;
              endOffset = 1;
            }
          }
        }
      }
      if (e.key === 'h') {
        if (endNode instanceof Text) {
          if (endOffset > 0) {
            endOffset -= 1;
          } else {
            const prevNode = getPreviousTextNode(endNode);
            if (prevNode) {
              endNode = prevNode;
              endOffset = prevNode.length - 1;
            }
          }
        }
      }
      const newRange = document.createRange();
      newRange.setStart(anchor, anchorOffset);
      newRange.setEnd(endNode, endOffset);
      selectedText.removeAllRanges();
      selectedText.addRange(newRange);
      selectionRef.current = newRange;

      const rangeForEnd = document.createRange();
      rangeForEnd.setStart(endNode, endOffset);
      rangeForEnd.setEnd(endNode, endOffset);
      const rect = rangeForEnd.getBoundingClientRect();
      setPosition({
        x: rect.left - pointerSize / 2,
        y: rect.bottom - pointerSize / 2,
      });

      e.preventDefault();
      e.stopPropagation();
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        document.execCommand('copy');
      }
      return;
    }

    // フォーカス中は他操作を無視
    if (isFocusingRef.current) {
      return;
    }

    // Alt + hjkl: ページスクロール／履歴操作
    if (e.altKey) {
      switch (e.key) {
        case 'h':
          // 履歴戻る
          chrome.runtime.sendMessage({ action: 'goBack' });
          break;
        case 'l':
          chrome.runtime.sendMessage({ action: 'goForward' });
          break;
        case 'j':
          window.scrollBy(0, stepY);
          break;
        case 'k':
          window.scrollBy(0, -stepY);
          break;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Ctrl+Space: クリック＋フォーカス
    if (e.code === 'Space' && e.ctrlKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      ['mousedown', 'mouseup', 'click'].forEach((type) => {
        target.dispatchEvent(
          new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            view: window,
          })
        );
      });
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) &&
        target instanceof HTMLElement &&
        typeof target.focus === 'function' &&
        !target.hasAttribute('disabled')
      ) {
        target.focus({ preventScroll: true });
        isFocusingRef.current = true;
        setIsFocusing(true);
        if (pointerRef.current) {
          pointerRef.current.style.background = 'blue';
        }
      }
      return;
    }

    // Ctrl+Alt+Space: ダブルクリック
    if (e.code === 'Space' && e.ctrlKey && e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      target.dispatchEvent(
        new MouseEvent('dblclick', {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          view: window,
        })
      );
      return;
    }

    // Alt+Space: 右クリック
    if (e.code === 'Space' && e.altKey && !e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      target.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          view: window,
        })
      );
      return;
    }

    // カーソル移動 (h/j/k/l)
    switch (e.key.toLowerCase()) {
      case 'k':
        move(0, -stepY);
        break;
      case 'j':
        move(0, stepY);
        break;
      case 'h':
        move(-stepX, 0);
        break;
      case 'l':
        move(stepX, 0);
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  // pointerRef を参照するために useRef だけ上位で確保
  const pointerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = keydownHandler;
    document.addEventListener('keydown', handler, true);
    return () => {
      document.removeEventListener('keydown', handler, true);
    };
    // position などをクロージャで参照する。必要に応じて position を依存に含める。
  }, [position, isCopyMode, isFocusing]); // 状態変化を反映するために依存に含む

  return {
    pointerRef,
    position,
    isFocusing,
    isCopyMode,
  };
}