// ブックマーク型定義
export type Bookmark = {
  id: string;
  title: string;
  url: string;
};

// パネルの状態型定義
export type PanelState = {
  showBookmarkManager: boolean;
  input: string;
  bookmarks: Bookmark[];
  filtered: Bookmark[];
  topBookmarks: Bookmark[];
  selectedIndex: number;
  tabCount: number;
  tabPressedCount: number;
};

// useReducer用アクション型定義
export type PanelAction =
  | { type: "TOGGLE_PANEL" }
  | { type: "SET_INPUT"; payload: string }
  | { type: "SET_BOOKMARKS"; payload: Bookmark[] }
  | { type: "SET_FILTERED"; payload: Bookmark[] }
  | { type: "SET_TOP_BOOKMARKS"; payload: Bookmark[] }
  | { type: "SET_SELECTED_INDEX"; payload: number }
  | { type: "SET_TAB_COUNT"; payload: number }
  | { type: "CLOSE_PANEL" }
  | { type: "SET_TAB_PRESSED_COUNT"; payload: number };