window.addEventListener("message", (event) => {
    if (event.source === window && event.data?.type === "moneyflow:duplicate-tab") {
        void chrome.runtime.sendMessage({ type: "moneyflow:duplicate-tab" });
    }
});
