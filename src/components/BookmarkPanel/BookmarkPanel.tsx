import { useEffect, useRef, useReducer, useState } from "react";
import type { Bookmark } from "../../types/BookmarkPanel";
import { initialState, reducer } from "./usePanelState";


type RuntimeMessage = {
  action: "toggleBookmarkManager" | "getBookmarks";
};

const BookmarkPanel = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // ダークモード・ライトモード判定
  const [theme, setTheme] = useState<"light" | "dark">(
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "light");
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  // ライト・ダークの色定義
  const colors = {
    light: {
      panelBg: "#ffffffff",
      panelText: "#4b1c1c",
      border: "#fca5a5",
      boxShadow: "0 3px 10px rgba(239, 68, 68, 0.5)",
      boxShadowInset: "inset 0 0 10px #fee2e2",
      inputBorder: "#fca5a5",
      inputFocusBorder: "none",//"#ef4444",
      listItemHoverBg: "#fee2e2",
      selectedBg: "#ef4444",
      selectedText: "#fff",
      unselectedText: "#b91c1c",
    },
    dark: {
      panelBg: "#2e2e2eff", // 暗いグレー
      panelText: "#f9fafb", // 薄い白系
      border: "#5a5a5aff", // ダークグレー
      boxShadow: "0 1px 5px rgba(245, 158, 11, 0.7)", // オレンジ系の影
      boxShadowInset: "inset 0 0 5px #f59e0b",
      inputBorder: "#5a5a5aff",
      inputFocusBorder: "none",//"#f59e0b",
      listItemHoverBg: "#374151",
      selectedBg: "#f59e0b", // 黄色系
      selectedText: "#1f1f1fff", // 背景に合わせてダーク文字
      unselectedText: "#f9fafb",
    },
  };

  const themeColors = theme === "dark" ? colors.dark : colors.light;

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

  // 共通テキスト算出関数
  const getCommonPrefix = (arr: string[]): string => {
    if (arr.length === 0) return "";
    let prefix = arr[0];
    for (let i = 1; i < arr.length; i++) {
      let j = 0;
      while (j < prefix.length && j < arr[i].length && prefix[j] === arr[i][j]) {
        j++;
      }
      prefix = prefix.slice(0, j);
      if (prefix === "") break;
    }
    return prefix;
  };

  // Tab/Shift+Tabインデックス管理
  const [tabIndex, setTabIndex] = useState<number | null>(null);

  // フィルタ処理
  const handleInputChange = (val: string) => {
    dispatch({ type: "SET_INPUT", payload: val });
    dispatch({ type: "SET_TAB_COUNT", payload: 0 });
    dispatch({ type: "SET_TAB_PRESSED_COUNT", payload: 0 });
    setTabIndex(null);

    if (val === "") {
      dispatch({ type: "SET_FILTERED", payload: state.topBookmarks });
    } else {
      const matches = state.bookmarks.filter((b) =>
        b.title.toLowerCase().startsWith(val.toLowerCase())
      ).slice(0, 5);
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
            backgroundColor: themeColors.panelBg,
            color: themeColors.panelText,
            zIndex: 9999999,
            padding: "1.5rem",
            border: `1px solid ${themeColors.border}`,
            borderRadius: "16px",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            fontSize: "1.2rem",
            boxShadow: themeColors.boxShadow,
          }}
        >
          

          {/* 検索欄 */}
          <input
            ref={inputRef}
            value={state.input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || (e.altKey && e.key === 'j')) {
                e.preventDefault();
                const nextIndex = (state.selectedIndex + 1) % state.filtered.length;
                dispatch({ type: "SET_SELECTED_INDEX", payload: nextIndex });
                dispatch({ type: "SET_TAB_PRESSED_COUNT", payload: 0 });
                setTabIndex(null);
              } else if (e.key === "ArrowUp" || (e.altKey && e.key === 'k')) {
                e.preventDefault();
                const prevIndex = (state.selectedIndex - 1 + state.filtered.length) % state.filtered.length;
                dispatch({ type: "SET_SELECTED_INDEX", payload: prevIndex });
                dispatch({ type: "SET_TAB_PRESSED_COUNT", payload: 0 });
                setTabIndex(null);
              } else if (e.key === "Enter") {
                e.preventDefault();
                const selectedBookmark = state.filtered[state.selectedIndex];
                if (selectedBookmark) {
                  window.open(selectedBookmark.url, "_blank");
                } else if (state.input.trim() !== "") {
                  const query = encodeURIComponent(state.input.trim());
                  window.open(`https://www.google.com/search?q=${query}`, "_blank");
                }
                dispatch({ type: "SET_TAB_PRESSED_COUNT", payload: 0 });
                setTabIndex(null);
              } else if (e.key === "Tab") {
                e.preventDefault();
                const filteredTitles = state.filtered.map(b => b.title);
                if (state.filtered.length === 0) return;
                if (!e.shiftKey) {
                  // Tab
                  if (tabIndex === null) {
                    // 1回目は共通prefix
                    const common = getCommonPrefix(filteredTitles);
                    dispatch({ type: "SET_INPUT", payload: common });
                    dispatch({ type: "SET_SELECTED_INDEX", payload: 0 });
                    setTabIndex(0);
                  } else if (tabIndex === 0) {
                    // 2回目もfiltered[0]
                    dispatch({ type: "SET_INPUT", payload: filteredTitles[0] });
                    dispatch({ type: "SET_SELECTED_INDEX", payload: 0 });
                    setTabIndex(1); // 次は1に進める
                  } else {
                    // 3回目以降はindexを進める
                    const nextIdx = (tabIndex) % state.filtered.length;
                    dispatch({ type: "SET_INPUT", payload: filteredTitles[nextIdx] });
                    dispatch({ type: "SET_SELECTED_INDEX", payload: nextIdx });
                    setTabIndex(tabIndex + 1);
                  }
                } else {
                  // Shift+Tab
                  if (tabIndex === null) {
                    // Tab1回目のあとにShift+Tabの場合はfiltered[0]を表示
                    dispatch({ type: "SET_INPUT", payload: filteredTitles[0] });
                    dispatch({ type: "SET_SELECTED_INDEX", payload: 0 });
                    setTabIndex(0);
                  } else {
                    // indexを戻す
                    const prevIdx = (tabIndex - 1 + state.filtered.length) % state.filtered.length;
                    dispatch({ type: "SET_INPUT", payload: filteredTitles[prevIdx] });
                    dispatch({ type: "SET_SELECTED_INDEX", payload: prevIdx });
                    setTabIndex(prevIdx);
                  }
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
              border: `2px solid ${themeColors.inputBorder}`,
              fontSize: "1rem",
              outline: "none",
              marginBottom: "1rem",
              backgroundColor: themeColors.panelBg,
              color: themeColors.panelText,
              lineHeight: '1rem',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = themeColors.inputFocusBorder;
              e.currentTarget.style.boxShadow = `0 0 8px ${themeColors.inputFocusBorder}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = themeColors.inputBorder;
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
              border: `1px solid ${themeColors.border}`,
              //boxShadow: themeColors.boxShadowInset,
              padding: 0,
              listStyle: "none",
              boxShadow: themeColors.boxShadowInset
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
                            backgroundColor: themeColors.selectedBg,
                            color: themeColors.selectedText,
                            fontWeight: "600",
                            borderRadius: "8px",
                            padding: "0.5rem 1rem",
                            cursor: "pointer",
                            userSelect: "none",
                          }
                        : {
                            backgroundColor: "transparent",
                            color: themeColors.unselectedText,
                            padding: "0.5rem 1rem",
                            cursor: "pointer",
                            userSelect: "none",
                          }
                    }
                    onMouseEnter={() => dispatch({ type: "SET_SELECTED_INDEX", payload: i })}
                    onClick={() => window.open(b.url, "_blank")}
                    onMouseOver={(e) => {
                  if (i !== state.selectedIndex) {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        themeColors.listItemHoverBg;
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

export default BookmarkPanel;