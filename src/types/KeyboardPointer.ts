export type PointerPosition = {
    x: number; // pointerのX座標
    y: number; // pointerのY座標
}

export type KeyboardState = {
    mode: 'idle' | 'focus' | 'copy'; // 現在のモード
    position: PointerPosition; // 現在のポインタ位置
    anchorNode: Text | null; // 選択範囲のアンカーノード
    anchorOffset: number; // 選択範囲のアンカーオフセット
};

export type KeyboardPointerActions = 
    | { type: 'INIT_MOVE'; position: PointerPosition } // 初期位置設定
    | { type: 'START_COPY'; node: Text; offset: number; rect: DOMRect } // コピー選択開始
    | { type: 'ADJUST_COPY'; node: Text; offset: number; rect: DOMRect } // コピー選択調整
    | { type: 'CANSEL_COPY' } // コピー選択キャンセル
    | { type: 'START_FOCUS' } // フォーカス開始
    | { type: 'CANSEL_FOCUS' } // フォーカスキャンセル
    | { type: 'MOVE'; dx: number; dy: number; rect?: DOMRect }; // ポインタ移動