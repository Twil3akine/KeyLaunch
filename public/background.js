chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getBookmarks") {
    chrome.bookmarks.getTree((nodes) => {
      sendResponse({ bookmarks: nodes });
    });
    return true; // async response
  }

  if (message.action === "goBack" || message.action === "goForward") {
    chrome.tabs.get(sender.tab.id, (tab) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (direction) => {
          try {
            if (direction === "back") {
              history.back();
            } else {
              history.forward();
            }
          } catch (e) {
            console.warn('History navigation error:', e);
          }
        },
        args: [message.action === "goBack" ? "back" : "forward"],
      });
    });
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "forward-action") {
    chrome.tabs.goForward().catch((e) => {
      console.warn('No next page in history.', e);
    });
  }

  if (command === "toggle-bookmark-manager") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleBookmarkManager" });
      }
    });
  }
});
