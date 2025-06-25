chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'goBack' || message.action === 'goForward') {
    chrome.tabs.get(sender.tab.id, (tab) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (direction) => {
          if (direction === 'back') history.back();
          else history.forward();
        },
        args: [message.action === 'goBack' ? 'back' : 'forward']
      });
    });
  }
});
