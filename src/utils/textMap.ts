export type CharRange = { //1文字ごとの位置情報付きデータ構造
  range: Range;
  text: string;
  rect: DOMRect;
};

let charRanges: CharRange[] = [];
let isMapBuilt = false;

/**
 * 全テキストノードの1文字ずつのRangeとRectを作成する関数
 */
export const buildCharRangeMap = () => {
  charRanges = [];

  const walker = document.createTreeWalker( //DOMを順番にたどるためのウォーカーを作る関数
    document.body, //ここから下のすべてを対象にする（bodyの中にあるすべての要素、ノードをたどる）
    NodeFilter.SHOW_TEXT, //テキストノードのみを対象（HTML要素（<div>など）は無視して、その中の「文字だけ」を対象）
    null //もう一つノードフィルターをかけれるが今回は不要なのでnull
  );

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    for (let i = 0; i < node.length; i++) {
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        charRanges.push({ range, text: node.data[i], rect });
      }
    }
  }

  isMapBuilt = true;
};

/*
 * DOM構造自体は変わっていないが文字の位置情報が変わった際の位置情報のみの再取得用の関数
 * 画面サイズ変更やスクロールなど
 * もともと毎回マップごとbuildCharRangeMapを読み込んでいたが動作が重くなるため文字位置のみを再取得する機能を作成した
 */
export const updateCharRects = () => {
  for (const char of charRanges) {
    const rect = char.range.getBoundingClientRect();
    char.rect = rect;
  }
};

/**
 * マップがまだ作られていなければ作る（初回呼び出し用）
 */
export const ensureCharRangeMap = () => {
  if (!isMapBuilt) {
    buildCharRangeMap();
  }
};

/**
 * マップをリセットして再構築可能にする
 */
export const resetCharRangeMap = () => {
  isMapBuilt = false;
  charRanges = [];
};

/**
 * 指定座標(x, y)に最も近い文字範囲を単純線形探索で取得
 */
const maxDistance = 100;
export const getNearestCharRange = (x: number, y: number): CharRange | null => {
  if (!isMapBuilt) return null;

  let nearest: CharRange | null = null;
  let minDist = Infinity;

  for (const char of charRanges) {
    const cx = char.rect.left + char.rect.width / 2;
    const cy = char.rect.top + char.rect.height / 2;

    const dx = x - cx;
    if (Math.abs(dx) > maxDistance) continue;//maxDistanceを超える場合はそれ以下の計算を省略して
    const dy = y - cy;
    if (Math.abs(dy) > maxDistance) continue;

    const dist = dx * dx + dy * dy;

    if (dist < minDist) {
      minDist = dist;
      nearest = char;
    }
  }
  return nearest;
};

/**
 * 指定インデックスの文字範囲を取得
 */
export const getCharRangeAtOffset = (index: number): CharRange | null => {
  if (index < 0 || index >= charRanges.length) return null; //無効な範囲ならnullを返す
  return charRanges[index]; //対象番号のCharRange（文字の範囲情報）を返す
};

/**
 * 指定Range（選択範囲）の『開始位置』に対応するcharRangesの（全体の範囲に対する）インデックスを返す
 */
export const getCharRangeIndex = (target: Range): number => {
  for (let i = 0; i < charRanges.length; i++) {
    const cr = charRanges[i];
    if (
      cr.range.startContainer === target.startContainer &&
      cr.range.startOffset === target.startOffset
    ) {
      return i;
    }
  }
  return -1; //該当の文字がなければ-1を返し、無いことを示す
  //-1を返すと、getCharRangeAtOffsetにおいてnullが返り、それを判定して処理を止める
};

/**
 * charRangesの（全体の範囲に対する）インデックスの長さを返す
 */
export const getCharRangeLength = () => charRanges.length;
