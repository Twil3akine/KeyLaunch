/// <reference types="chrome" />

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

/**
 * useKeyboardPointer: 仮想ポインタの状態管理・キーボード操作統合フック
 * - ポインタ位置、コピー選択モード、フォーカスモードの管理
 * - 各種キーボード操作に応じてポインタ移動、選択、クリック、ダブルクリック、右クリックなどを制御
 */
export function useKeyboardPointer({ pointerSize, margin }: UseKeyboardPointerOptions) {
  // 1. position state & ref
  // 画面中央に初期配置
  const [position, setPosition] = useState<PointerPosition>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const positionRef = useRef<PointerPosition>(position);
  // positionRef を最新化するための関数
  const updatePosition = useCallback((pos: PointerPosition) => {
    positionRef.current = pos;
    setPosition(pos);
  }, []);

  // 2. コピー選択用のサブフック
  const {
    isCopyMode,
    startCopy,
    adjustCopy,
    cancelCopy,
  } = useCopySelection();

  // 3. フォーカス管理用のサブフック
  const {
    isFocusing,
    isFocusingRef,
    startFocus,
    cancelFocus,
  } = useFocusBehavior();

  // 4. ポインタ移動用のサブフック
  const { move } = usePointerMovement(pointerSize, margin, positionRef, updatePosition);

  // 5. 各種ハンドラ群を useCallback でメモ化

  /**
   * コピー選択開始 (Alt+C キーに対応)
   * startCopy は選択範囲開始とポインタ位置の更新を行う
   * ポインタ位置は選択範囲の文字の左下に合わせる（pointerSize/2 を差し引く）
   */
  const handleCopyToggle = useCallback((clientX: number, clientY: number) => {
    startCopy(clientX, clientY, (pos) => {
      updatePosition({ x: pos.x - pointerSize / 2, y: pos.y - pointerSize / 2 });
    });
  }, [startCopy, updatePosition, pointerSize]);

  /**
   * フォーカス・コピー状態解除（Escapeなどで呼び出し）
   */
  const handleCancel = useCallback(() => {
    cancelFocus();
    cancelCopy();
    // isFocusing / isCopyMode の状態に応じてコンポーネント側でポインタ色変更など対応予定
  }, [cancelFocus, cancelCopy]);

  /**
   * コピー選択範囲の左右調整（H/Lキー）
   * 選択範囲の終端を拡大・縮小し、ポインタ位置も更新
   */
  const handleCopyAdjust = useCallback((direction: 'left' | 'right') => {
    adjustCopy(direction, (pos) => {
      updatePosition({ x: pos.x - pointerSize / 2, y: pos.y - pointerSize / 2 });
    });
  }, [adjustCopy, updatePosition, pointerSize]);

  /**
   * Alt+H/L/J/K キーでのページスクロールや履歴移動（Chrome拡張のメッセージ送信）
   */
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

  /**
   * Ctrl+Space でのクリック + フォーカス処理
   * 仮想ポインタ位置でマウスイベントを発火し、フォーカス可能ならフォーカス開始
   */
  const handleClickFocus = useCallback((clientX: number, clientY: number) => {
    (['mousedown', 'mouseup', 'click'] as const).forEach((type) => {
      dispatchMouseEvent(type, clientX, clientY);
    });
    const target = document.elementFromPoint(clientX, clientY);
    if (target) {
      startFocus(target);
    }
  }, [startFocus]);

  /**
   * Ctrl+Alt+Space でのダブルクリック処理
   */
  const handleDoubleClick = useCallback((clientX: number, clientY: number) => {
    dispatchMouseEvent('dblclick', clientX, clientY);
  }, []);

  /**
   * Alt+Space での右クリック処理
   */
  const handleContextMenu = useCallback((clientX: number, clientY: number) => {
    dispatchMouseEvent('contextmenu', clientX, clientY);
  }, []);

  /**
   * h/j/k/l キーによる仮想ポインタ移動
   */
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

  // 6. キーボードイベント登録
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

  return {
    pointerRef: null as unknown as React.RefObject<HTMLDivElement>, // 実装時に ref を渡す場合は変更
    position,
    isFocusing,
    isCopyMode,
    getPointerRef: () => null,
  };
}
