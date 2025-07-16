import { useRef, useState } from 'react';
import {
  getNearestCharRange,
  getCharRangeAtOffset,
  getCharRangeIndex,
} from '../../utils/textMap'; // テキスト選択の管理をbodyのindexでやる方針に切り替えた
//import type { PointerPosition } from '../../types/VirtualPointer'; //現在は使っていない


type UseCopySelectionReturn = {
  isCopyMode: boolean;
  startCopy: (clientX: number, clientY: number, onSelected: (pos: { x: number; y: number }) => void) => void; //onSelectedは選択した文字の座標について、呼び出し側で処理を決めれるコールバック関数(startCopyの要素)
  adjustCopy: (
    direction: 'left' | 'right',
    onUpdate: (pos: { x: number; y: number }) => void
  ) => void;
  cancelCopy: () => void;
};

/**
 * useCopySelection: コピー選択範囲管理フック
 * - コピー選択の開始、範囲拡大・縮小、解除を行う
 * - ポインタの座標は選択範囲の端（文字の左下）に合わせて更新
 */
export function useCopySelection(): UseCopySelectionReturn {
  const [isCopyMode, setIsCopyMode] = useState(false);
  const selection = window.getSelection();
  // 開始・終了のindex管理
  const startIndexRef = useRef<number | null>(null);
  const endIndexRef = useRef<number | null>(null);

  /**
   * コピー選択開始 (Alt+C)
   * clientX, clientY の位置のテキストノードとオフセットを取得し
   * 範囲を初期化。ポインタも範囲開始位置に移動。
   * bodyの文字単位の範囲選択
   *  @param clientX 仮想ポインタのX座標
   *  @param clientY 仮想ポインタのY座標
   *  @param onSelected 選択完了時のコールバック（選択文字の座標受け渡し用）
   */
  const startCopy = (
    clientX: number,
    clientY: number,
    onSelected: (pos: { x: number; y: number }) => void
  ) => {
    // nearestからRange取得
    const nearest = getNearestCharRange(clientX, clientY);
    if (!nearest) return; //nearestがNullの場合は処理を止めて範囲を動かさずに止める
    const range = nearest.range.cloneRange(); //nearestのrangeを複製

    // 選択範囲設定
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range); 
    }
    setIsCopyMode(true);

    // インデックス記憶
    startIndexRef.current = getCharRangeIndex(range);
    endIndexRef.current = startIndexRef.current;

    // 選択矩形座標取得（UI調整用）
    const rect = range.getBoundingClientRect();
    onSelected({ x: rect.left, y: rect.bottom });// - pointerSize/2 の調整は呼び出し側で行う
  };

  /**
   * コピー範囲を左右に調整 (h/l)
   * 範囲終端のテキストノードとオフセットを更新し、範囲再設定
   * ポインタ位置も末尾に合わせて更新
   */
  /**
   * @param direction 'left' or 'right'
   * @param onUpdate 選択更新時のコールバック（更新時の文字の座標選択）
   */
  const adjustCopy = (
    direction: 'left' | 'right',
    onUpdate: (pos: { x: number; y: number }) => void
  ) => {
    if (!isCopyMode || startIndexRef.current === null || endIndexRef.current === null) return;

    // 選択範囲の一番後ろの文字の配列番号（index）計算
    let newEnd = endIndexRef.current + (direction === 'right' ? 1 : -1);   

    // Range 更新
    const newRange = getCharRangeAtOffset(newEnd);
    const startRange = getCharRangeAtOffset(startIndexRef.current);
    if (!newRange || !startRange) return; // 範囲外なら処理を止めて範囲を動かさずに止める

    // 範囲の構築（開始位置よりも後ろか前かで開始・終了を逆転させる）
    const range = document.createRange();
    if (newEnd > startIndexRef.current) {
      range.setStart(startRange.range.startContainer, startRange.range.startOffset);
      range.setEnd(newRange.range.endContainer, newRange.range.endOffset);
    } else {
      range.setStart(newRange.range.startContainer, newRange.range.startOffset);
      range.setEnd(startRange.range.endContainer, startRange.range.endOffset);
    }

    // 選択範囲の更新
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range); 
    }

    endIndexRef.current = newEnd;

    const rect = newRange.range.getBoundingClientRect();
    onUpdate({ x: rect.left, y: rect.bottom });
  };

  /**
   * コピー選択解除 (Escape)
   * 選択範囲をクリアし、状態をリセットする
   */
  const cancelCopy = () => {
    /*const sel = window.getSelection();
    if (sel) sel.removeAllRanges();*/
    window.getSelection()?.removeAllRanges(); //ほぼ真上のコメントアウト2行と同じ意味
    setIsCopyMode(false);
    startIndexRef.current = null;
    endIndexRef.current = null;
  };

  return {
    isCopyMode,
    startCopy,
    adjustCopy,
    cancelCopy,
  };
}
