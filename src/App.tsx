import VirtualPointer from "./components/VitualPointer/VirtualPointer";
import BookmarkPanel from "./components/BookmarkPanel/BookmarkPanel";
import { useEffect, useState } from "react";

const App = () => {
  const [isShowBookmarkPanel, setIsShowBookmarkPanel] = useState<boolean>(false);

  useEffect(() => {
    // background.jsからのメッセージを受けてパネル開閉
    const listener = (message: any) => {
      if (message.action === "toggleBookmarkManager") {
        setIsShowBookmarkPanel((prev) => !prev);
        console.log("toggleBookmarkManager message received");
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []); // ← 依存配列を空に

  return (
    <>
      <VirtualPointer isShowBookmarkPanel={isShowBookmarkPanel} />
      <BookmarkPanel />
    </>
  );
}

export default App;
