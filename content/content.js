let cursor = document.createElement('div');
cursor.id = 'keyboard-cursor';
document.body.appendChild(cursor);

let x = window.innerWidth / 2;
let y = window.innerHeight / 2;

const cursorSize = 10;   // カーソルサイズ
const margin = 20;       // 端のマージン（スクロールバー分を考慮）

cursor.style.position = 'fixed';
cursor.style.width = cursorSize + 'px';
cursor.style.height = cursorSize + 'px';
cursor.style.background = 'red';
cursor.style.borderRadius = '50%';
cursor.style.zIndex = '9999';
cursor.style.pointerEvents = 'none';
cursor.style.left = x + 'px';
cursor.style.top = y + 'px';

function move(dx, dy) {
  x = Math.max(0, Math.min(window.innerWidth - cursorSize - margin, x + dx));
  y = Math.max(0, Math.min(window.innerHeight - cursorSize - margin, y + dy));
  cursor.style.left = x + 'px';
  cursor.style.top = y + 'px';

  const el = document.elementFromPoint(x + cursorSize / 2, y + cursorSize / 2);
  if (el) {
    el.dispatchEvent(new MouseEvent('mousemove', {
      clientX: x + cursorSize / 2,
      clientY: y + cursorSize / 2
    }));
  }
}

let isFocusing = false;

// capture段階でキー入力を必ず検知するように true を指定
document.addEventListener('keydown', (e) => {
  const stepX = (e.shiftKey ? window.innerWidth / 40 : window.innerWidth / 20);
  const stepY = (e.shiftKey ? window.innerHeight / 40 : window.innerHeight / 20);

  // 1) Esc でフォーカス解除（必ず最優先で捕まえる）
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();

    const activeElement = document.activeElement;
    if (activeElement && typeof activeElement.blur === 'function') {
      activeElement.blur();
    }
    setTimeout(() => {
      isFocusing = false;
      cursor.style.background = 'red';
    }, 10);
    return;
  }

  // 2) フォーカス中はマウスカーソル移動キーのみ無視する（WASD/HJKL）
  if (isFocusing && ['h','j','k','l','H','J','K','L'].includes(e.key)) {
    e.stopPropagation();
    e.preventDefault();  // ←移動だけ無効にする
    return;
  }


  // 3) Alt + hjkl でページスクロール
  if (e.altKey) {
    switch (e.key) {
      case 'h': window.scrollBy(-stepX, 0); break;
      case 'l': window.scrollBy(stepX, 0); break;
      case 'j': window.scrollBy(0, stepY); break;
      case 'k': window.scrollBy(0, -stepY); break;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // 4) 疑似マウスカーソル下の要素を取得
  const target = document.elementFromPoint(x + cursorSize / 2, y + cursorSize / 2);
  if (!target) return;

  // 5) Ctrl + Space → クリック + focus
  if (e.code === 'Space' && e.ctrlKey && !e.altKey) {
    e.preventDefault();
    e.stopPropagation();

    const clientX = x + cursorSize / 2;
    const clientY = y + cursorSize / 2;

    // mousedown → mouseup → click の順で発火させる
    ['mousedown', 'mouseup', 'click'].forEach(type => {
      target.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        view: window,
      }));
    });

    // フォーカス可能要素に対して focus() を呼び出す
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
      target.focus({ preventScroll: true });
      cursor.style.background = 'blue';
      isFocusing = true;
    }

    // もし既に別の要素にフォーカスがあれば blur()
    const prev = document.activeElement;
    if (prev && typeof prev.blur === 'function' && prev !== target) {
      prev.blur();
    }

    return;
  }

  // 6) Ctrl + Alt + Space → dblclick
  if (e.code === 'Space' && e.ctrlKey && e.altKey) {
    e.preventDefault();
    e.stopPropagation();

    const clientX = x + cursorSize / 2;
    const clientY = y + cursorSize / 2;
    target.dispatchEvent(new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      view: window,
    }));
    return;
  }

  // 7) Alt + Space → 右クリック（contextmenu）
  if (e.code === 'Space' && e.altKey && !e.ctrlKey) {
    e.preventDefault();
    e.stopPropagation();

    const clientX = x + cursorSize / 2;
    const clientY = y + cursorSize / 2;
    target.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      view: window,
    }));
    return;
  }

  // 8) フォーカスしていないときのみカーソル移動（WASD/HJKL）
  switch (e.key) {
    case 'k': case 'K':
      move(0, -stepY);
      e.preventDefault();
      e.stopPropagation();
      break;
    case 'j': case 'J':
      move(0, stepY);
      e.preventDefault();
      e.stopPropagation();
      break;
    case 'h': case 'H':
      move(-stepX, 0);
      e.preventDefault();
      e.stopPropagation();
      break;
    case 'l': case 'L':
      move(stepX, 0);
      e.preventDefault();
      e.stopPropagation();
      break;
    default:
      break;
  }
}, true);  // ← 最後の true が「キャプチャフェーズでリスンする」指定
