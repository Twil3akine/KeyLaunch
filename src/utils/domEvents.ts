/**
 * MouseEvent を発行するユーティリティ。
 * @param type 'mousemove' | 'mousedown' | 'mouseup' | 'click' | 'dblclick' | 'contextmenu'
 * @param clientX クライアント座標 X
 * @param clientY クライアント座標 Y
 * @param targetEventTarget 発行先要素。指定がなければ elementFromPoint の要素を使う。
 */

export const dispatchMouseEvent = (
    type: 'mousemove' | 'mousedown' | 'mouseup' | 'click' | 'dblclick' | 'contextmenu',
    clientX: number,
    clientY: number,
    targetEventTarget?: Element | null
) => {
    const target = targetEventTarget
    ?? document.elementFromPoint(clientX, clientY);

    if (!target) return;

    const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        view: window,
    });
    target.dispatchEvent(event);
}

/**
 * 要素取得ユーティリティ。elementFromPoint をラップし、型アサーションなどを追加する場合に。
 */
export const getElementFromPoint = (x: number, y: number): Element | null => {
  return document.elementFromPoint(x, y);
}