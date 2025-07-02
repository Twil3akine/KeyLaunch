import { useEffect, useState, useRef } from "react";

type Bookmark = {
  id: string;
  title: string;
  url: string;
};

const Panel = () => {
  const [showBookmarkManager, setShowBookmarkManager] = useState(false);
  const [input, setInput] = useState("");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [filtered, setFiltered] = useState<Bookmark[]>([]);
  const [topBookmarks, setTopBookmarks] = useState<Bookmark[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tabCount, setTabCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // パネル表示のトグル
  useEffect(() => {
    const listener = (message: any) => {
      if (message.action === "toggleBookmarkManager") {
        setShowBookmarkManager((prev) => {
          const next = !prev;
          if (next) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
          return next;
        });
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

      const traverse = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
        for (const node of nodes) {
          if (node.url) flat.push({ id: node.id, title: node.title, url: node.url });
          if (node.children) traverse(node.children);
        }
      };

      traverse(response.bookmarks);
      setBookmarks(flat);
      setTopBookmarks(flat.slice(0, 5));
      setFiltered(flat.slice(0, 5));
    });
  }, []);

  // Google検索フォールバック
  useEffect(() => {
    if (input.length > 0 && filtered.length === 0) {
      const timer = setTimeout(() => {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(input)}`, "_blank");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [input, filtered]);

  const handleInputChange = (val: string) => {
    setInput(val);
    setTabCount(0);
    if (val === "") {
      setFiltered(topBookmarks);
    } else {
      const matches = bookmarks
        .filter((b) => b.title.toLowerCase().startsWith(val.toLowerCase()))
        .slice(0, 5);
      setFiltered(matches);
      setSelectedIndex(0);
    }
  };

  return (
    <div className="p-4">
      {showBookmarkManager && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "500px",
            backgroundColor: "white",
            zIndex: 9999999,
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          }}
        >
          <h2 className="text-lg font-semibold mb-2">📑 ブックマーク管理</h2>

          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                setSelectedIndex((prev) => (prev + 1) % filtered.length);
              } else if (e.key === "ArrowUp") {
                setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
              } else if (e.key === "Enter") {
                if (filtered[selectedIndex]) {
                  window.open(filtered[selectedIndex].url, "_blank");
                }
              } else if (e.key === "Tab") {
                e.preventDefault();
                if (tabCount === 0 && filtered.length > 0) {
                  setInput(filtered[0].title);
                  setTabCount(1);
                } else if (tabCount === 1) {
                  const matches = bookmarks.filter((b) =>
                    b.title.toLowerCase().includes(input.toLowerCase())
                  );
                  setFiltered(matches);
                  setSelectedIndex(0);
                  setTabCount(2);
                }
              }
            }}
            placeholder="🔍 ブックマークを検索"
            className="w-full px-3 py-2 border rounded focus:outline-none"
          />

          <ul className="mt-2 max-h-64 overflow-y-auto">
            {filtered.map((b, i) => (
              <li
                key={b.id}
                className={`px-2 py-1 cursor-pointer ${
                  i === selectedIndex ? "bg-blue-100" : ""
                }`}
                onMouseEnter={() => setSelectedIndex(i)}
                onClick={() => window.open(b.url, "_blank")}
              >
                {b.title}
              </li>
            ))}
          </ul>

          <button
            onClick={() => setShowBookmarkManager(false)}
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
