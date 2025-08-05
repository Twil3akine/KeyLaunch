import type { PanelState, PanelAction } from "../../types/BookmarkPanel";

// パネルの初期状態
export const initialState: PanelState = {
  showBookmarkManager: false,
  input: "",
  bookmarks: [],
  filtered: [],
  topBookmarks: [],
  selectedIndex: 0,
  tabCount: 0,
  tabPressedCount: 0,
};

// useReducerの// reducer関数
export const reducer = (state: PanelState, action: PanelAction): PanelState => {
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
	case "SET_TAB_PRESSED_COUNT":
	  return { ...state, tabPressedCount: action.payload };
	default:
	  return state;
  }
};