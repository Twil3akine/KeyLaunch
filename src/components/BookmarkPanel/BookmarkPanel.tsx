import { useEffect, useRef, useReducer } from "react";

// ブックマーク型定義
type Bookmark = {
  id: string;
  title: string;
  url: string;
};

// パネルの状態型定義
type PanelState = {
  showBookmarkManager: boolean;
  input: string;
  bookmarks: Bookmark[];
  filtered: Bookmark[];
  topBookmarks: Bookmark[];
  selectedIndex: number;
  tabCount: number;
};

// useReducer用アクション型定義
type PanelAction =
  | { type: "TOGGLE_PANEL" }
  | { type: "SET_INPUT"; payload: string }
  | { type: "SET_BOOKMARKS"; payload: Bookmark[] }
  | { type: "SET_FILTERED"; payload: Bookmark[] }
  | { type: "SET_TOP_BOOKMARKS"; payload: Bookmark[] }
  | { type: "SET_SELECTED_INDEX"; payload: number }
  | { type: "SET_TAB_COUNT"; payload: number }
  | { type: "CLOSE_PANEL" };

// 初期状態
const initialState: PanelState = {
  showBookmarkManager: false,
  input: "",
  bookmarks: [],
  filtered: [],
  topBookmarks: [],
  selectedIndex: 0,
  tabCount: 0,
};

// reducer関数
function reducer(state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case "TOGGLE_PANEL":
      return { ...state, showBookmarkManager: !state.showBookmarkManager };
    case "SET_INPUT":
      return { ...state, input: action.payload };
    case "SET_BOOKMARKS":
      return { ...state, bookmarks: action.payload };
    case "SET_FILTERED":
      return { ...state, filtered: action.payload };
    case "SET_TOP_BOOKMARKS":
      return { ...state, topBookmarks: action.payload };
    case "SET_SELECTED_INDEX":
      return { ...state, selectedIndex: action.payload };
    case "SET_TAB_COUNT":
      return { ...state, tabCount: action.payload };
    case "CLOSE_PANEL":
      return { ...state, showBookmarkManager: false };
    default:
      return state;
  }
}

type RuntimeMessage = {
  action: "toggleBookmarkManager" | "getBookmarks";
};

const Panel = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // パネルの開閉トグル
  useEffect(() => {
    const listener = (message: RuntimeMessage) => {
      if (message.action === "toggleBookmarkManager") {
        dispatch({ type: "TOGGLE_PANEL" });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // パネル開いたらinputにフォーカス
  useEffect(() => {
    if (state.showBookmarkManager) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [state.showBookmarkManager]);

  // ブックマーク取得
  useEffect(() => {
    chrome.runtime.sendMessage({ action: "getBookmarks" }, (response) => {
      if (!response?.bookmarks) return;
      const flat: Bookmark[] = [];

      const traverse = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
        for (const node of nodes) {
          if (node.url) flat.push({ id: node.id, title: node.title, url: node.url });
          if (node.children) traverse(node.children);
        }
      };

      traverse(response.bookmarks);
      dispatch({ type: "SET_BOOKMARKS", payload: flat });
      dispatch({ type: "SET_TOP_BOOKMARKS", payload: flat.slice(0, 5) });
      dispatch({ type: "SET_FILTERED", payload: flat.slice(0, 5) });
    });
  }, []);

  // 選択要素をスクロール
  useEffect(() => {
    itemRefs.current[state.selectedIndex]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [state.selectedIndex]);

  // フィルタ処理
  const handleInputChange = (val: string) => {
    dispatch({ type: "SET_INPUT", payload: val });
    dispatch({ type: "SET_TAB_COUNT", payload: 0 });

    if (val === "") {
      dispatch({ type: "SET_FILTERED", payload: state.topBookmarks });
    } else {
      const matches = state.bookmarks.filter((b) =>
        b.title.toLowerCase().startsWith(val.toLowerCase())
      );
      dispatch({ type: "SET_FILTERED", payload: matches });
      dispatch({ type: "SET_SELECTED_INDEX", payload: 0 });
    }
  };

  return (
    <div className="p-4">
      {state.showBookmarkManager && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "500px",
            backgroundColor: "white",
            color: "black",
            zIndex: 9999999,
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          }}
        >
          <h2 className="text-lg font-semibold mb-2">📑 ブックマーク管理</h2>

          {/* 検索欄 */}
          <input
            ref={inputRef}
            value={state.input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                if (state.filtered.length > 0) {
                  dispatch({
                    type: "SET_SELECTED_INDEX",
                    payload: (state.selectedIndex + 1) % state.filtered.length,
                  });
                }
              } else if (e.key === "ArrowUp") {
                if (state.filtered.length > 0) {
                  dispatch({
                    type: "SET_SELECTED_INDEX",
                    payload: (state.selectedIndex - 1 + state.filtered.length) % state.filtered.length,
                  });
                }
              } else if (e.key === "Enter") {
                const selected = state.filtered[state.selectedIndex];
                if (selected) {
                  window.open(selected.url, "_blank");
                } else if (state.input.length > 0 && state.filtered.length === 0) {
                  window.open(`https://www.google.com/search?q=${encodeURIComponent(state.input)}`, "_blank");
                }
              } else if (e.key === "Tab") {
                e.preventDefault();
                if (state.tabCount === 0 && state.filtered.length > 0) {
                  dispatch({ type: "SET_INPUT", payload: state.filtered[0].title });
                  dispatch({ type: "SET_TAB_COUNT", payload: 1 });
                } else if (state.tabCount === 1) {
                  const matches = state.bookmarks.filter((b) =>
                    b.title.toLowerCase().includes(state.input.toLowerCase())
                  );
                  dispatch({ type: "SET_FILTERED", payload: matches });
                  dispatch({ type: "SET_SELECTED_INDEX", payload: 0 });
                  dispatch({ type: "SET_TAB_COUNT", payload: 2 });
                }
              }
            }}
            placeholder="🔍 ブックマークを検索"
            className="w-full px-3 py-2 border rounded focus:outline-none"
          />

          {/* 候補リスト */}
            <ul className="mt-2 max-h-64 overflow-y-auto">
              {state.filtered.map((b, i) => (
                <li
                  key={`${b.id}-${i}`}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  className="px-2 py-1 cursor-pointer rounded transition-colors"
style={ i === state.selectedIndex ? { backgroundColor: '#3b82f6', color: 'white', fontWeight: '600' } : undefined }

                  onMouseEnter={() => dispatch({ type: "SET_SELECTED_INDEX", payload: i })}
                  onClick={() => window.open(b.url, "_blank")}
                >
                  {b.title}
                </li>
              ))}
            </ul>


          {/* 閉じるボタン */}
          <button
            onClick={() => dispatch({ type: "CLOSE_PANEL" })}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
};

export default Panel;
