import { useEffect, useState } from "react";

const Panel = () => {
  const [showBookmarkManager, setShowBookmarkManager] = useState(false);

  useEffect(() => {
    const listener = (message: any) => {
      if (message.action === "toggleBookmarkManager") {
        setShowBookmarkManager(prev => !prev);
      }
    };

    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  return (
    <div className="p-4">
      {showBookmarkManager && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'white',
            zIndex: 9999999,
            padding: '1rem',
            border: '1px solid #ccc',
            borderRadius: '12px',
          }}
        >
          <h2 className="text-lg font-semibold mb-2">📑 ブックマーク管理</h2>
          <ul className="list-disc pl-4">
            <li>Google</li>
            <li>GitHub</li>
            <li>Notion</li>
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
