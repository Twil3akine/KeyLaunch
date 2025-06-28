import React, { useRef, useEffect } from 'react';
import { useKeyboardPointer } from './useKeyboardPointer';
import { ensureCharRangeMap, updateCharRects   } from '../../utils/textMap';

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

  // ページ初回表示時に1回だけテキストマップ作成
  useEffect(() => {
    //resetCharRangeMap(); // 前の状態クリア、必要なら追加
    ensureCharRangeMap(); 
  }, []); // 1回だけ呼ばれるように依存配列空にする
  // 画面リサイズ時に画面における文字の位置を再取得
  useEffect(() => {
    const handleResize = () => {
      updateCharRects();
    };

    window.addEventListener('resize', handleResize); //リスナーを登録
    return () => window.removeEventListener('resize', handleResize); //コンポーネントが消えたらリスナーを解除
  }, []);
  // 画面スクロール時に画面における文字の位置を再取得
  useEffect(() => {
    let timeoutId: number | null = null;

    const handleScroll = () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        updateCharRects();
      }, 550); // スクロール終了後550msに再構築（調整要検討）
      /**
      * キーボード長押しの連続入力は、最初から2回目の間隔が最大で512ms、それ以降は最大で39ms（実際にChrome上で計測した）
      * 連打の時間は人によって違うだろうが150ms程度で、最大で250-300ms程度と考えるのが妥当
      * このくらいスクロールによる遅延時間を入れればupdateCharRects();を連続して行わなくなる
      * しかし、この(遅延時間)＋(updateCharRects();の処理時間)の間にコピーを開始すると、スクロール前の座標を参照する
      * そのため、updateCharRects();の処理が1回くらい挟まるのを気にしないなら遅延時間を250-300ms程度に短くしても良い
      * updateCharRects();はもともと読み取ってあるテキストマップから、文字の画面における座標を読み取るだけなので意外と軽量
       */
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  

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
