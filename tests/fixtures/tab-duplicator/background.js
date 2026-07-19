// A real browser-level duplication is observably different from window.open(). Keep the
// privileged operation isolated in this test-only extension so the regression test can exercise
// the same Chrome path as Duplicate Tab in the tab context menu.
chrome.runtime.onMessage.addListener((message, sender) => {
    if (message?.type === "moneyflow:duplicate-tab" && sender.tab?.id !== undefined) {
        void chrome.tabs.duplicate(sender.tab.id);
    }
});
