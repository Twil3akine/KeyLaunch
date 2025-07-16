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
            top: "35vh",
            left: "50vw",
            transform: "translate(-50%, -50%)",
            width: "600px",
            // maxWidth: "500px",
            backgroundColor: "#fff",
            color: "#4b1c1c", // dark red系文字色
            zIndex: 9999999,
            padding: "1.5rem",
            border: "1px solid #fca5a5", // red-300系の薄い赤ボーダー
            borderRadius: "16px",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            fontSize: "1.2rem"
          }}
        >
          

          {/* 検索欄 */}
          <input
            ref={inputRef}
            value={state.input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                const nextIndex = (state.selectedIndex + 1) % state.filtered.length;
                dispatch({ type: "SET_SELECTED_INDEX", payload: nextIndex });
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                const prevIndex =
                  (state.selectedIndex - 1 + state.filtered.length) % state.filtered.length;
                dispatch({ type: "SET_SELECTED_INDEX", payload: prevIndex });
              } else if (e.key === "Enter") {
                e.preventDefault();
                const selectedBookmark = state.filtered[state.selectedIndex];
                if (selectedBookmark) {
                  window.open(selectedBookmark.url, "_blank");
                }
              }
            }}
            placeholder="🔍 ブックマークを検索"
            style={{
              display: "block",
              width: "100%",
              padding: "0.5rem 1rem",
              boxSizing: "border-box",
              borderRadius: "12px",
              border: "2px solid #fecaca",
              fontSize: "1rem",
              outline: "none",
              // transition: "border-color 0.3s ease, box-shadow 0.3s ease",
              marginBottom: "1rem",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#ef4444";
              e.currentTarget.style.boxShadow = "0 0 8px rgba(239, 68, 68, 0.6)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#fecaca";
              e.currentTarget.style.boxShadow = "none";
            }}
          />


          {/* 候補リスト */}
             <ul
                style={{
                  maxHeight: "16rem",
                  overflowY: "auto",
                  marginTop: "0.5rem",
                  borderRadius: "12px",
                  border: "1px solid #fca5a5", // red-300
                  boxShadow: "inset 0 0 10px #fee2e2", // 薄い内側の赤い影
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {state.filtered.map((b, i) => (
                  <li
                    key={`${b.id}-${i}`}
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    style={
                      i === state.selectedIndex
                        ? {
                            backgroundColor: "#ef4444", // red-500
                            color: "#ffffff",
                            fontWeight: "600",
                            borderRadius: "8px",
                            boxShadow: "0 3px 10px rgba(239, 68, 68, 0.5)",
                            padding: "0.5rem 1rem",
                            cursor: "pointer",
                            // transition: "background-color 0.2s ease, color 0.2s ease",
                            userSelect: "none",
                          }
                        : {
                            backgroundColor: "transparent",
                            color: "#b91c1c", // red-700
                            padding: "0.5rem 1rem",
                            cursor: "pointer",
                            // transition: "background-color 0.2s ease, color 0.2s ease",
                            userSelect: "none",
                          }
                    }
                    onMouseEnter={() => dispatch({ type: "SET_SELECTED_INDEX", payload: i })}
                    onClick={() => window.open(b.url, "_blank")}
                    onMouseOver={(e) => {
                      if (i !== state.selectedIndex) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "#fee2e2"; // red-200 薄赤
                      }
                    }}
                    onMouseOut={(e) => {
                      if (i !== state.selectedIndex) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {b.title}
                  </li>
                ))}
              </ul>

        </div>
      )}
    </div>
  );
};

export default Panel;
