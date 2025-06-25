// src/components/KeyboardPointer/KeyboardPointer.tsx
import React from 'react';
import { useKeyboardPointer } from './useKeyboardPointer';

const pointerSize = 10;
const margin = 20;

const KeyboardPointer: React.FC = () => {
  const { pointerRef, position, isFocusing, isCopyMode } = useKeyboardPointer({
    pointerSize,
    margin,
  });

  // style オブジェクトを直接指定。必要に応じて styled-components や CSS Modules 等も利用可能。
  const style: React.CSSProperties = {
    position: 'fixed',
    width: `${pointerSize}px`,
    height: `${pointerSize}px`,
    background: isCopyMode ? 'green' : isFocusing ? 'blue' : 'red',
    borderRadius: '50%',
    zIndex: 9999,
    pointerEvents: 'none',
    left: `${position.x}px`,
    top: `${position.y}px`,
  };

  return <div ref={pointerRef} id="keyboard-pointer" style={style} />;
};

export default KeyboardPointer;
