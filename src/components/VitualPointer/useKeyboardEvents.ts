import { useEffect } from 'react';
import type { PointerPosition } from '../../types/KeyboardPointer';

type Handlers = {
  // 座標系: clientX, clientY を計算するために position.x/y と pointerSize/2 が必要
  handleCopyToggle: (clientX: number, clientY: number) => void;
  handleCancel: () => void;
  handleCopyAdjust: (direction: 'left' | 'right') => void;
  isCopyMode: () => boolean;
  isFocusingRef: React.MutableRefObject<boolean>;
  handleScrollOrHistory: (key: string, stepY: number) => boolean;
  handleClickFocus: (clientX: number, clientY: number) => void;
  handleDoubleClick: (clientX: number, clientY: number) => void;
  handleContextMenu: (clientX: number, clientY: number) => void;
  handleMove: (key: string, stepX: number, stepY: number) => boolean;
};

/**
 * useKeyboardEvents: document-level の keydown 登録と各種ハンドラ呼び出し
 * positionRef: 最新の position
 * pointerSize: ポインタの大きさ
 */
export function useKeyboardEvents(
  positionRef: React.MutableRefObject<PointerPosition>,
  pointerSize: number,
  margin: number,
  handlers: Handlers
) {
  useEffect(() => {
    const keydownHandler = (e: KeyboardEvent) => {
      const stepX = e.shiftKey ? window.innerWidth / 50 : window.innerWidth / 20;
      const stepY = e.shiftKey ? window.innerHeight / 50 : window.innerHeight / 20;
      const clientX = positionRef.current.x + pointerSize / 2;
      const clientY = positionRef.current.y + pointerSize / 2;

      // Ctrl+Q: コピー選択開始
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        e.stopPropagation();
        handlers.handleCopyToggle(clientX, clientY);
        return;
      }
      // Escape: フォーカス／コピー解除
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handlers.handleCancel();
        return;
      }
      // Copyモード中の調整
      if (handlers.isCopyMode() && (e.key === 'h' || e.key === 'l' || (e.ctrlKey && e.key.toLowerCase() === 'c'))) {
        // h/l adjust
        if (e.key === 'l') {
          handlers.handleCopyAdjust('right');
        } else if (e.key === 'h') {
          handlers.handleCopyAdjust('left');
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'c') {
          // コピー実行: document.execCommand('copy') は startCopy側で既に選択範囲更新されている前提
          document.execCommand('copy');
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // フォーカス中は他操作を無視
      if (handlers.isFocusingRef.current) {
        return;
      }
      // Alt + hjkl: ページスクロール／履歴操作
      if (e.altKey) {
        const handled = handlers.handleScrollOrHistory(e.key, stepY);
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      // Ctrl+Space: クリック + フォーカス
      if (e.code === 'Space' && e.ctrlKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        handlers.handleClickFocus(clientX, clientY);
        return;
      }
      // Ctrl+Alt+Space: ダブルクリック
      if (e.code === 'Space' && e.ctrlKey && e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        handlers.handleDoubleClick(clientX, clientY);
        return;
      }
      // Alt+Space: 右クリック
      if (e.code === 'Space' && e.altKey && !e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        handlers.handleContextMenu(clientX, clientY);
        return;
      }
      // カーソル移動 (h/j/k/l)
      const moved = handlers.handleMove(e.key.toLowerCase(), stepX, stepY);
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', keydownHandler, true);
    return () => {
      document.removeEventListener('keydown', keydownHandler, true);
    };
  }, [
    positionRef,
    pointerSize,
    margin,
    // handlers 内部で useCallback 化している想定なら handlers.* は参照が安定
    handlers,
  ]);
}
