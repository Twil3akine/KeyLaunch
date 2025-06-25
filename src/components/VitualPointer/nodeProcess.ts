// ノード内のテキストのオフセットを取得する関数（caretRangeFromPoinがあるから関数として独立させるべき）
export const getTextNodeAndOffsetFromPoint = (
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
export const getNextTextNode = (node: Node): Text | null => {
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
export const getPreviousTextNode = (node: Node): Text | null => {
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
export const findTextNodeDown = (node: Node): Text | null => {
  if (node instanceof Text && node.length > 0) return node; // テキストノードなら返す
  for (let child = node.firstChild; child; child = child.nextSibling) {
    const text = findTextNodeDown(child); // 子ノードを再帰探索
    if (text) return text; // 見つかれば返す
  }
  return null; // 見つからなければnull
}

//階層的にテキストを逆順に探索
export const findTextNodeUp = (node: Node): Text | null => {
  if (node instanceof Text && node.length > 0) return node; // テキストノードなら返す
  for (let child = node.lastChild; child; child = child.previousSibling) {
    const text = findTextNodeUp(child); // 子ノードを逆順に再帰探索
    if (text) return text; // 見つかれば返す
  }
  return null; // 見つからなければ null
}