import React, { useRef, useEffect } from 'react';
import { useKeyboardPointer } from './useKeyboardPointer';

const pointerSize = 10;
const margin = 20;

const KeyboardPointer: React.FC = () => {
  const pointerRef = useRef<HTMLDivElement>(null);
  const { position, isFocusing, isCopyMode } = useKeyboardPointer({ pointerSize, margin });
  /**   現状は必要ない（現在の設計では使ってない）が、
   * 仮想ポインタの div 要素に ref（pointerRef）を利用するケースは以下の2つが考えられる:
   * 1.フックのrefからVirturePointerのref（pointerRef）に返す場合
   * 2.VirturePointerのref（pointerRef）フックに渡す場合
   */
  /**   必要になった場合は以下のようにそれぞれ対応してください:
   * 1.返す場合は、VirtualPointer側の記述をconst { position, isFocusing, isCopyMode, pointerRef } = useKeyboardPointer({ pointerSize, margin });のようにして、useKeyboardPointer の返り値に pointerRef を含める設計にする 
   * 2.渡す場合は、（useKeyboardPointer({pointerSize, margin, pointerRef}) などのようにuseKeyboardPointer の引数として渡すように設計する 
   */

  // 初回描画時やリサイズ時に位置をウィンドウ中央に初期化したい場合はここで処理
  useEffect(() => {
    if (pointerRef.current) {
      pointerRef.current.style.left = `${position.x}px`;
      pointerRef.current.style.top = `${position.y}px`;
    }
  }, [position]);

  return (
    <div
      ref={pointerRef}
      id="keyboard-pointer"
      style={{
        position: 'fixed',
        width: `${pointerSize}px`,
        height: `${pointerSize}px`,
        background: isCopyMode ? 'green' : isFocusing ? 'blue' : 'red',
        borderRadius: '50%',
        zIndex: 9999,
        pointerEvents: 'none',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    />
  );
};

export default KeyboardPointer;
