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

// パネルの初期状態
const initialState: PanelState = {
  showBookmarkManager: false,
  input: "",
  bookmarks: [],
  filtered: [],
  topBookmarks: [],
  selectedIndex: 0,
  tabCount: 0,
};

// useReducerのreducer関数
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

// chrome.runtime.onMessageの型定義
type RuntimeMessage = {
  action: "toggleBookmarkManager" | "getBookmarks";
};

const Panel = () => {
  // useReducerで状態管理
  const [state, dispatch] = useReducer(reducer, initialState);
  // 入力欄のref
  const inputRef = useRef<HTMLInputElement>(null);

  // パネル表示のトグル用リスナー
  useEffect(() => {
    const listener = (message: RuntimeMessage) => {
      if (message.action === "toggleBookmarkManager") {
        dispatch({ type: "TOGGLE_PANEL" });
        () => inputRef.current?.focus();
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // ブックマーク取得（background経由）
  useEffect(() => {
    chrome.runtime.sendMessage({ action: "getBookmarks" }, (response) => {
      if (!response?.bookmarks) return;
      const flat: Bookmark[] = [];

      // ブックマークツリーをフラット化
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

  // 入力値変更時の処理
  const handleInputChange = (val: string) => {
    dispatch({ type: "SET_INPUT", payload: val });
    dispatch({ type: "SET_TAB_COUNT", payload: 0 });
    if (val === "") {
      dispatch({ type: "SET_FILTERED", payload: state.topBookmarks });
    } else {
      const matches = state.bookmarks
        .filter((b) => b.title.toLowerCase().startsWith(val.toLowerCase()))
      dispatch({ type: "SET_FILTERED", payload: matches });
      dispatch({ type: "SET_SELECTED_INDEX", payload: 0 });
    }
  };

  return (
    <div className="p-4">
      {/* パネル本体 */}
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

          {/* 検索入力欄 */}
          <input
            ref={inputRef}
            autoFocus
            value={state.input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.altKey && e.key === "j") {
                // 下矢印で選択インデックスを進める
                dispatch({
                  type: "SET_SELECTED_INDEX",
                  payload: (state.selectedIndex + 1) % state.filtered.length,
                });
              } else if (e.altKey && e.key === "k") {
                // 上矢印で選択インデックスを戻す
                dispatch({
                  type: "SET_SELECTED_INDEX",
                  payload: (state.selectedIndex - 1 + state.filtered.length) % state.filtered.length,
                });
              } else if (e.key === "Enter") {
                // Enterで選択中のブックマークを開く
                if (state.filtered[state.selectedIndex]) {
                  window.open(state.filtered[state.selectedIndex].url, "_blank");
                } else if (state.input.length > 0 && state.filtered.length === 0) {
                  // 候補がなければ即Google検索
                  window.open(`https://www.google.com/search?q=${encodeURIComponent(state.input)}`, "_blank");
                }
              } else if (e.key === "Tab") {
                // Tabで補完や部分一致検索
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

          {/* 検索結果リスト */}
          <ul className="mt-2 max-h-64 overflow-y-auto">
            {state.filtered.map((b, i) => (
              <li
                key={b.id}
                className={`px-2 py-1 cursor-pointer ${
                  i === state.selectedIndex ? "bg-blue-100" : ""
                }`}
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
