import React, { useRef, useEffect } from 'react';
import { useKeyboardPointer } from './useKeyboardPointer';

const pointerSize = 10;
const margin = 20;

const KeyboardPointer: React.FC = () => {
  const pointerRef = useRef<HTMLDivElement>(null);
  // hook から返す設計に合わせて pointerRef を渡す場合、hook 側を修正してください
  const { position, isFocusing, isCopyMode } = useKeyboardPointer({ pointerSize, margin });
  // pointerRef を hook に渡す場合は useKeyboardPointer({pointerSize, margin, pointerRef}) など設計を調整

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
