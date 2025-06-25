import { useRef, useState, useCallback } from 'react';
import type { PointerPosition } from '../../types/KeyboardPointer';
import { useCopySelection } from './useCopySelection';
import { useFocusBehavior } from './useFocusBehavior';
import { usePointerMovement } from './usePointerMovement';
import { useKeyboardEvents } from './useKeyboardEvents';
import { dispatchMouseEvent } from '../../utils/domEvents';

type UseKeyboardPointerOptions = {
  pointerSize: number;
  margin: number;
};

export function useKeyboardPointer({ pointerSize, margin }: UseKeyboardPointerOptions) {
  // 1. position state & ref
  const [position, setPosition] = useState<PointerPosition>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const positionRef = useRef<PointerPosition>(position);
  // positionRef を最新化
  const updatePosition = useCallback((pos: PointerPosition) => {
    positionRef.current = pos;
    setPosition(pos);
  }, []);

  // 2. サブフック: コピー選択
  const {
    isCopyMode,
    startCopy,
    adjustCopy,
    cancelCopy,
  } = useCopySelection();

  // 3. サブフック: フォーカス管理
  const {
    isFocusing,
    isFocusingRef,
    startFocus,
    cancelFocus,
  } = useFocusBehavior();

  // 4. サブフック: ポインタ移動
  const { move } = usePointerMovement(pointerSize, margin, positionRef, updatePosition);

  // 5. handlers をまとめたメモ化関数群
  const handleCopyToggle = useCallback((clientX: number, clientY: number) => {
    // startCopy 内で setPosition を呼ぶ際に pointerSize/2 を差し引く処理を一緒に行う
    startCopy(clientX, clientY, (pos) => {
      updatePosition({ x: pos.x - pointerSize / 2, y: pos.y - pointerSize / 2 });
    });
  }, [startCopy, updatePosition, pointerSize]);

  const handleCancel = useCallback(() => {
    cancelFocus();
    cancelCopy();
    // ポインタ色等はコンポーネント側で isFocusing/isCopyMode に応じて行う想定
  }, [cancelFocus, cancelCopy]);

  const handleCopyAdjust = useCallback((direction: 'left' | 'right') => {
    adjustCopy(direction, (pos) => {
      updatePosition({ x: pos.x - pointerSize / 2, y: pos.y - pointerSize / 2 });
    });
  }, [adjustCopy, updatePosition, pointerSize]);

  const handleScrollOrHistory = useCallback((key: string, stepY: number): boolean => {
    switch (key) {
      case 'h':
        chrome.runtime.sendMessage({ action: 'goBack' });
        return true;
      case 'l':
        chrome.runtime.sendMessage({ action: 'goForward' });
        return true;
      case 'j':
        window.scrollBy(0, stepY);
        return true;
      case 'k':
        window.scrollBy(0, -stepY);
        return true;
      default:
        return false;
    }
  }, []);

  const handleClickFocus = useCallback((clientX: number, clientY: number) => {
    // クリック発行
    (['mousedown', 'mouseup', 'click'] as const).forEach((type) => {
      dispatchMouseEvent(type, clientX, clientY);
    });
    // フォーカス
    const target = document.elementFromPoint(clientX, clientY);
    if (target) {
      startFocus(target);
    }
  }, [startFocus]);

  const handleDoubleClick = useCallback((clientX: number, clientY: number) => {
    dispatchMouseEvent('dblclick', clientX, clientY);
  }, []);

  const handleContextMenu = useCallback((clientX: number, clientY: number) => {
    dispatchMouseEvent('contextmenu', clientX, clientY);
  }, []);

  const handleMove = useCallback((key: string, stepX: number, stepY: number): boolean => {
    switch (key) {
      case 'k':
        move(0, -stepY);
        return true;
      case 'j':
        move(0, stepY);
        return true;
      case 'h':
        move(-stepX, 0);
        return true;
      case 'l':
        move(stepX, 0);
        return true;
      default:
        return false;
    }
  }, [move]);

  // 6. キーイベント登録: サブフック useKeyboardEvents でまとめて document.addEventListener する
  useKeyboardEvents(positionRef, pointerSize, margin, {
    handleCopyToggle,
    handleCancel,
    handleCopyAdjust,
    isCopyMode: () => isCopyMode,
    isFocusingRef,
    handleScrollOrHistory,
    handleClickFocus,
    handleDoubleClick,
    handleContextMenu,
    handleMove,
  });

  // 返り値
  return {
    pointerRef: null as unknown as React.RefObject<HTMLDivElement>, // コンポーネント側で ref を生成する場合は調整可能
    // pointerRef は実際コンポーネント側で useRef<HTMLDivElement> を作り、この hook から返すように変更できます
    position,
    isFocusing,
    isCopyMode,
    // pointerRef の扱いを揃える場合:
    getPointerRef: () => {
      // 呼び出し側で useRef<HTMLDivElement> を作る場合はここを使って返す設計に
      return null;
    },
  };
}
