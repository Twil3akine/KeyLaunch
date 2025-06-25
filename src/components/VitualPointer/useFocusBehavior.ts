import { useRef, useState } from 'react';

/**
 * useFocusBehavior: フォーカス管理ロジック
 */
export function useFocusBehavior() {
  const isFocusingRef = useRef(false);
  const [isFocusing, setIsFocusing] = useState(false);

  /**
   * フォーカス開始 (呼び出し側でクリック発行済みと想定)
   */
  const startFocus = (target: Element) => {
    if (!(target instanceof HTMLElement)) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && typeof target.focus === 'function' && !target.hasAttribute('disabled')) {
      target.focus({ preventScroll: true });
      isFocusingRef.current = true;
      setIsFocusing(true);
    }
  };

  /**
   * フォーカス解除
   */
  const cancelFocus = () => {
    const active = document.activeElement;
    if (active && typeof (active as HTMLElement).blur === 'function') {
      (active as HTMLElement).blur();
    }
    isFocusingRef.current = false;
    setIsFocusing(false);
  };

  return {
    isFocusing,
    isFocusingRef,
    startFocus,
    cancelFocus,
  };
}
