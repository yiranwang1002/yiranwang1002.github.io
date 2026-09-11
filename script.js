// 更新两个城市时间
function updateClock() {
  const now = new Date();

  // 多伦多 UTC-4
  const torontoOptions = {
    timeZone: "America/Toronto",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  };
  const torontoStr = now.toLocaleTimeString("zh-CN", torontoOptions);
  document.getElementById("toronto-time").innerText = torontoStr;

  // 北京时间 Asia/Shanghai UTC+8
  const beijingOptions = {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  };
  const beijingStr = now.toLocaleTimeString("zh-CN", beijingOptions);
  document.getElementById("beijing-time").innerText = beijingStr;
}

// 立刻执行一次
updateClock();
// 每1000毫秒(1秒)刷新一次时间
setInterval(updateClock, 1000);