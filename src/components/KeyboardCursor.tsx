import { useEffect, useRef, useState } from 'react';

const KeyboardCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);

  // カーソル位置（状態）
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  // フォーカス状態（再レンダー用）
  const [isFocusing, setIsFocusing] = useState(false);
  // フォーカス状態を即座に反映する ref
  const isFocusingRef = useRef(false);

  const cursorSize = 10;
  const margin = 20;

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    // 最初にカーソルの位置を反映
    const updateCursor = () => {
      cursor.style.left = `${position.x}px`;
      cursor.style.top = `${position.y}px`;
    };
    updateCursor();

    // move(): カーソルを dx, dy だけ動かし、mousemoveイベントも発火させる
    const move = (dx: number, dy: number) => {
      setPosition((prev) => {
        const newX = Math.max(
          0,
          Math.min(window.innerWidth - cursorSize - margin, prev.x + dx)
        );
        const newY = Math.max(
          0,
          Math.min(window.innerHeight - cursorSize - margin, prev.y + dy)
        );

        const el = document.elementFromPoint(
          newX + cursorSize / 2,
          newY + cursorSize / 2
        );
        if (el) {
          el.dispatchEvent(
            new MouseEvent('mousemove', {
              clientX: newX + cursorSize / 2,
              clientY: newY + cursorSize / 2,
            })
          );
        }

        return { x: newX, y: newY };
      });
    };

    // キーダウンハンドラ
    const keydownHandler = (e: KeyboardEvent) => {
      const stepX = e.shiftKey
        ? window.innerWidth / 40
        : window.innerWidth / 20;
      const stepY = e.shiftKey
        ? window.innerHeight / 40
        : window.innerHeight / 20;

      const clientX = position.x + cursorSize / 2;
      const clientY = position.y + cursorSize / 2;
      const target = document.elementFromPoint(clientX, clientY);
      if (!target) return;

      // 1) Escape でフォーカス解除
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        const active = document.activeElement;
        if (active && typeof (active as HTMLElement).blur === 'function') {
          (active as HTMLElement).blur();
        }

        // フォーカスを解除する
        isFocusingRef.current = false;
        setIsFocusing(false);
        if (cursor) {
          cursor.style.background = 'red';
        }
        return;
      }

      // 2) フォーカス中は他操作をすべて無視（移動も停止）
      if (isFocusingRef.current) {
        return;
      }

      // 3) Alt + hjkl でページスクロール
      if (e.altKey) {
        switch (e.key) {
          case 'h':
            window.scrollBy(-stepX, 0);
            break;
          case 'l':
            window.scrollBy(stepX, 0);
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

      // 4) Ctrl + Space → クリック + フォーカス
      if (e.code === 'Space' && e.ctrlKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();

        // mousedown, mouseup, click を順番に発火
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

        // フォーカス可能な INPUT/TEXTAREA/SELECT の場合
        if (
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) &&
          target instanceof HTMLElement &&
          typeof target.focus === 'function' &&
          !target.hasAttribute('disabled')
        ) {
          // 即座にフォーカスし、すぐに isFocusingRef = true に変更
          target.focus({ preventScroll: true });
          isFocusingRef.current = true;
          setIsFocusing(true);
          if (cursor) {
            cursor.style.background = 'blue';
          }

          // 他にアクティブな要素があれば、少し遅延して blur()
          setTimeout(() => {
            const prev = document.activeElement;
            if (
              prev &&
              typeof (prev as HTMLElement).blur === 'function' &&
              prev !== target
            ) {
              (prev as HTMLElement).blur();
            }
          }, 50);
        }

        // フォーカス処理時はここで必ず return（後続の move/dblclick を抑止）
        return;
      }

      // 5) Ctrl + Alt + Space → ダブルクリック
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

      // 6) Alt + Space → 右クリック
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

      // 7) カーソル移動（フォーカス中でない場合のみ）
      switch (e.key) {
        case 'k':
        case 'K':
          move(0, -stepY);
          break;
        case 'j':
        case 'J':
          move(0, stepY);
          break;
        case 'h':
        case 'H':
          move(-stepX, 0);
          break;
        case 'l':
        case 'L':
          move(stepX, 0);
          break;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('keydown', keydownHandler, true);
    return () => {
      document.removeEventListener('keydown', keydownHandler, true);
    };
  }, [position]);

  return (
    <div
      ref={cursorRef}
      id="keyboard-cursor"
      style={{
        position: 'fixed',
        width: `${cursorSize}px`,
        height: `${cursorSize}px`,
        background: isFocusing ? 'blue' : 'red',
        borderRadius: '50%',
        zIndex: 9999,
        pointerEvents: 'none',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    />
  );
};

export default KeyboardCursor;
