import { useRef, useState, useCallback } from 'react';

/**
 * useFocusBehavior: フォーカス状態管理フック
 * - isFocusing: React state で色の再レンダー用
 * - isFocusingRef: イベント処理やDOM操作で即時参照用の ref
 * 
 * startFocus: フォーカス対象の HTMLElement に .focus() して状態を更新
 * cancelFocus: フォーカス解除し状態リセット
 */
export function useFocusBehavior() {
  const [isFocusing, setIsFocusing] = useState(false);
  const isFocusingRef = useRef(false);

  /**
   * 指定した要素にフォーカスをセットし、状態を管理
   * フォーカス中は仮想ポインタの色を変えるなどのUI反映を想定
   */
const startFocus = useCallback((target: Element) => {
  if (
    target instanceof HTMLElement &&
    (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
      target.isContentEditable
    ) &&
    typeof target.focus === 'function' &&
    !target.hasAttribute('disabled')
  ) {
    target.focus({ preventScroll: true });
    isFocusingRef.current = true;
    setIsFocusing(true);
  }
}, []);


  /**
   * フォーカス状態を解除し、状態をリセットする
   * 仮想ポインタの色も元に戻すなどの処理を想定
   */
  const cancelFocus = useCallback(() => {
    const active = document.activeElement;
    if (active && typeof (active as HTMLElement).blur === 'function') {
      (active as HTMLElement).blur();
    }
    isFocusingRef.current = false;
    setIsFocusing(false);
  }, []);

  return {
    isFocusing,
    isFocusingRef,
    startFocus,
    cancelFocus,
  };
}
