let cursor = document.createElement('div');
cursor.id = 'keyboard-cursor';
document.body.appendChild(cursor);

let x = window.innerWidth / 2;
let y = window.innerHeight / 2;

const cursorSize = 10;  // グローバルに定義
const margin = 20;  // スクロールバー分を考慮したマージン

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

document.addEventListener('keydown', (e) => {
  const stepX = (e.shiftKey ? window.innerWidth / 30 : window.innerWidth / 15);
  const stepY = (e.shiftKey ? window.innerHeight / 30 : window.innerHeight / 15);

  if (e.altKey) {
    switch (e.key) {
      case 'h':
        window.scrollBy(-stepX, 0);
        break;
      case 'l':
        window.scrollBy(stepX, 0);
        break;
      case 'j':
        window.scrollBy(0, stepY);
        break;
      case 'k':
        window.scrollBy(0, -stepY);
        break;
    }
    e.preventDefault();
    return;
  }

  switch (e.key) {
    case 'w':
    case 'k':
    case 'W':
    case 'K':
      move(0, -stepY);
      break;
    case 's':
    case 'j':
    case 'S':
    case 'J':
      move(0, stepY);
      break;
    case 'a':
    case 'h':
    case 'A':
    case 'H':
      move(-stepX, 0);
      break;
    case 'd':
    case 'l':
    case 'D':
    case 'L':
      move(stepX, 0);
      break;
  }

  const target = document.elementFromPoint(x + cursorSize / 2, y + cursorSize / 2);
  if (!target) return;

  if (e.code === 'Space' && e.ctrlKey && e.altKey) {
    target.dispatchEvent(new MouseEvent('dblclick', {
      bubbles: true,
      clientX: x + cursorSize / 2,
      clientY: y + cursorSize / 2
    }));
  } else if (e.code === 'Space' && e.altKey) {
    target.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      clientX: x + cursorSize / 2,
      clientY: y + cursorSize / 2
    }));
  } else if (e.code === 'Space' && e.ctrlKey) {
    target.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      clientX: x + cursorSize / 2,
      clientY: y + cursorSize / 2
    }));
  }
});
