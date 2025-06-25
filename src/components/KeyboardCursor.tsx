import { useEffect, useRef, useState } from 'react';



const KeyboardCursor = () => {
  // 仮想ポインタの生成
  const cursorRef = useRef<HTMLDivElement>(null); 

  // カーソル位置（状態）
  // 画面中央に初期配置
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: window.innerWidth / 2, 
    y: window.innerHeight / 2,
  });
  // フォーカス状態の定義（色変更時の再レンダー（再描画）用）
  const [isFocusing, setIsFocusing] = useState(false);
  // フォーカス状態をDOM操作やイベント処理時に即座に保持、参照するためのref
  const isFocusingRef = useRef(false);

  // コピーモード状態
  const [isCopyMode, setIsCopyMode] = useState(false); // コピー選択中かの状態
  const selectionRef = useRef<Range | null>(null); // 現在の選択範囲保持
  const anchorNodeRef = useRef<Node | null>(null); // コピー開始位置のノードを保持
  const anchorOffsetRef = useRef<number>(0); // コピー開始位置（文字の左）を保持

  const cursorSize = 10; // カーソルの大きさ（px）
  const margin = 20; // ウィンドウ端の余白

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
        ? window.innerWidth / 50
        : window.innerWidth / 20;
      const stepY = e.shiftKey
        ? window.innerHeight / 50
        : window.innerHeight / 20;

      const clientX = position.x + cursorSize / 2;
      const clientY = position.y + cursorSize / 2;
      const target = document.elementFromPoint(clientX, clientY);
      if (!target) return;

      // Ctrl + Q でコピー（選択）モードを切り替え
      if (e.ctrlKey && e.key.toLowerCase() === 'q') {
        e.preventDefault(); // ブラウザのデフォルト動作を無効化
        e.stopPropagation(); // 他のキーハンドラーへの伝播を止め、処理の競合を防ぐ

        const caretInfo = getTextNodeAndOffsetFromPoint(clientX, clientY); //仮想カーソルの座標（clientX, clientY）の位置にあるテキストノードとその文字位置（オフセット）を取得
        if (caretInfo) { // caretInfoがnullじゃなければ
          const { node, offset } = caretInfo;
          const range = document.createRange(); //範囲（Range）オブジェクトを作成
          //範囲の開始位置と終了位置を同じ場所に設定（コピーの最初の文字、開始点を設定（範囲はまだ0））
          range.setStart(node, offset);
          range.setEnd(node, offset);

          const selection = window.getSelection(); //　ブラウザの現在の選択範囲を取得
          if (selection) {
            selection.removeAllRanges(); //現在の選択範囲を取り除き
            selection.addRange(range); // rangeを新たな選択範囲として反映
            const rect = range.getBoundingClientRect(); //選択範囲の位置情報をDOMRectオブジェクトとして取得
            //仮想ポインタを初期位置（文字の左下）に
            setPosition({
              x: rect.left - cursorSize / 2,
              y: rect.bottom - cursorSize / 2,
            });
            // 現在の選択範囲とコピー開始ノードと位置(アンカーのノードと位置）を保存
            selectionRef.current = range;
            anchorNodeRef.current = node;
            anchorOffsetRef.current = offset;
            setIsCopyMode(true); // コピーモードを有効化
          }
        }

        return;
      }

      // Escape でモード解除
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        const active = document.activeElement;
        if (active && typeof (active as HTMLElement).blur === 'function') {
          (active as HTMLElement).blur();
        }

        // フォーカスを解除する
        isFocusingRef.current = false; // フォーカス状態のrefをリセット
        setIsFocusing(false); // Reactのstateもリセットし再レンダー
        // コピーモード解除
        setIsCopyMode(false); 
        selectionRef.current = null; // 選択範囲情報をクリア
        anchorNodeRef.current = null; // コピー開始ノード情報をクリア
        if (cursor) {
          cursor.style.background = 'red'; // 仮想ポインタの色を解除状態に戻す
        }
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges(); // 実際のテキスト選択もクリア
        return;
      }

      // Copyモード中
      if (isCopyMode && selectionRef.current && anchorNodeRef.current) {
        const sel = window.getSelection();
        const anchor = anchorNodeRef.current;
        const anchorOffset = anchorOffsetRef.current;

        if (!sel || !anchor || !(anchor instanceof Text)) return;

        let currentRange = sel.getRangeAt(0); //現在の選択範囲を取得（selが保持する最初のRangeを取得）
        let endNode = currentRange.endContainer;
        let endOffset = currentRange.endOffset;

        // lキー右に1文字進める（範囲拡大）
        if (e.key === 'l') {
          if (endNode instanceof Text) {
            if (endOffset < endNode.length) {
              endOffset += 1; // 同じノード内で1文字進む
            } else {
              // Nodeの長さをOffsetが超えるなら次のテキストノードへ
              let nextNode = getNextTextNode(endNode);
              if (nextNode) {
                endNode = nextNode;
                endOffset = 1; // 次ノードの先頭1文字目に移動
              }
            }
          }
        }

        //hキー左に1文字戻す（範囲縮小）
        if (e.key === 'h') {
          if (endNode instanceof Text) {
            if (endOffset > 0) {
              endOffset -= 1;
            } else {
              // NodeのOffsetが0以下になるなら前のノードへ
              let prevNode = getPreviousTextNode(endNode);
              if (prevNode) {
                endNode = prevNode;
                endOffset = prevNode.length - 1; // 範囲縮小のため末尾を前のテキストノードの最後に戻す
              }
            }
          }
        }

        // 範囲を作り直す
        const newRange = document.createRange();
        newRange.setStart(anchor, anchorOffset);
        newRange.setEnd(endNode, endOffset);

        sel.removeAllRanges();
        sel.addRange(newRange);
        selectionRef.current = newRange; // 選択範囲の更新を保存

        // 仮想ポインタを選択末尾に移動するためのRangeオブジェクト作成
        const rangeForEnd = document.createRange();
        rangeForEnd.setStart(endNode, endOffset);
        rangeForEnd.setEnd(endNode, endOffset);
        const rect = rangeForEnd.getBoundingClientRect();
        setPosition({// 仮想ポインタの位置を選択範囲末尾に合わせて更新
          x: rect.left - cursorSize / 2,
          y: rect.bottom - cursorSize / 2,
        }); 

        e.preventDefault();
        e.stopPropagation();

        if (e.ctrlKey && e.key.toLowerCase() === 'c') {
          document.execCommand('copy'); // Ctrl+Cで選択範囲をコピー実行
        }
        return;
      }// Copyモード中の処理の末尾

      // 2) フォーカス中は他操作をすべて無視（移動も停止）
      if (isFocusingRef.current) {
        return; // フォーカス中はキーダウン処理を中断し他操作を無効化
      }

      // 3) Alt + hjkl でページスクロール
      if (e.altKey) {
        switch (e.key) {
          case 'h':
						chrome.runtime.sendMessage({ action: "goBack" });
            break;
          case 'l':
						chrome.runtime.sendMessage({ action: "goForward" });
            break;
          case 'j':
            window.scrollBy(0, stepY); // Alt+j で縦スクロール下へ
            break;
          case 'k':
            window.scrollBy(0, -stepY); // Alt+k で縦スクロール上へ
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
            new MouseEvent(type, { // 仮想ポインタ位置で擬似クリックイベント発火
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
          target.focus({ preventScroll: true }); // 対象にフォーカス（スクロール抑制付き）
          isFocusingRef.current = true; // refのフォーカス状態をtrueに
          setIsFocusing(true); // 状態更新（再レンダー）
          if (cursor) {
            cursor.style.background = 'blue'; // フォーカス時のポインタ色を青に変更
          }

          // 他にアクティブな要素があれば、少し遅延して blur()
          setTimeout(() => {
            const prev = document.activeElement;
            if (
              prev &&
              typeof (prev as HTMLElement).blur === 'function' &&
              prev !== target
            ) {
              (prev as HTMLElement).blur(); // フォーカス移動先以外を遅延で blur 解除
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
          new MouseEvent('dblclick', {// ダブルクリックイベントを発火
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
          new MouseEvent('contextmenu', {// 右クリックイベント発火
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
          move(0, -stepY); // kキーで上に移動
          break;
        case 'j':
        case 'J':
          move(0, stepY); // jキーで下に移動
          break;
        case 'h':
        case 'H':
          move(-stepX, 0); // hキーで左に移動
          break;
        case 'l':
        case 'L':
          move(stepX, 0); // lキーで右に移動
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
  }, [position]);// useEffectの末尾

  return (
    <div
      ref={cursorRef}
      id="keyboard-cursor"
      style={{
        position: 'fixed',
        width: `${cursorSize}px`,
        height: `${cursorSize}px`,
        background: isCopyMode ? 'green' : (isFocusing ? 'blue' : 'red'), //仮想ポインタの色制御
        borderRadius: '50%',
        zIndex: 9999,
        pointerEvents: 'none',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    />
  );
};

// ノード内のテキストのオフセットを取得する関数（caretRangeFromPoinがあるから関数として独立させるべき）
const getTextNodeAndOffsetFromPoint = (
  x: number,
  y: number
): { node: Text; offset: number } | null => {
  const range = document.caretRangeFromPoint // ブラウザ上で (x, y) の位置にあるテキスト範囲（Range）を取得
    ? document.caretRangeFromPoint(x, y)
    : (document as any).caretPositionFromPoint?.(x, y); //新しい書き方のフォーバック（代替処理）

  if (range) {
    const node = range.startContainer;
    const offset = range.startOffset;
    if (node instanceof Text) {
      return { node, offset };
    }
  }
  return null;
}

//　入力のノードの次のテキストノードを取得(関数にする必要なさそうだけど、)
const getNextTextNode = (node: Node): Text | null => {
  while (node) {
    if (node.nextSibling) {
      node = node.nextSibling;
      if (node instanceof Text && node.length > 0) return node; // 次の兄弟ノードがテキストなら返す
      const text = findTextNodeDown(node);
      if (text) return text; // 子孫ノードにテキストがあれば返す
    } else {
      node = node.parentNode!; // 兄弟ノードがなければ親へ戻る
    }
  }
  return null; // 見つからなければ null を返す
}

// 入力のノードの次のテキストノードを取得
const getPreviousTextNode = (node: Node): Text | null => {
  while (node) {
    if (node.previousSibling) {
      node = node.previousSibling;
      if (node instanceof Text && node.length > 0) return node; // 前の兄弟ノードがテキストなら返す
      const text = findTextNodeUp(node);
      if (text) return text; // 子孫ノードにテキストがあれば返す
    } else {
      node = node.parentNode!; // 前の兄弟がなければ親へ戻る
    }
  }
  return null; // 見つからなければnullを返す
}

//階層的にテキストを探索
const findTextNodeDown = (node: Node): Text | null => {
  if (node instanceof Text && node.length > 0) return node; // テキストノードなら返す
  for (let child = node.firstChild; child; child = child.nextSibling) {
    const text = findTextNodeDown(child); // 子ノードを再帰探索
    if (text) return text; // 見つかれば返す
  }
  return null; // 見つからなければnull
}

//階層的にテキストを逆順に探索
const findTextNodeUp = (node: Node): Text | null => {
  if (node instanceof Text && node.length > 0) return node; // テキストノードなら返す
  for (let child = node.lastChild; child; child = child.previousSibling) {
    const text = findTextNodeUp(child); // 子ノードを逆順に再帰探索
    if (text) return text; // 見つかれば返す
  }
  return null; // 見つからなければ null
}

export default KeyboardCursor; // コンポーネントのエクスポート
