// ========== 原有实时时钟代码（完全保留） ==========
function updateClock() {
  const now = new Date();

  // 多伦多时间
  const torontoOptions = {
    timeZone: "America/Toronto",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  };
  const torontoStr = now.toLocaleTimeString("zh-CN", torontoOptions);
  document.getElementById("toronto-time").innerText = torontoStr;

  // 北京时间
  const beijingOptions = {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  };
  const beijingStr = now.toLocaleTimeString("zh-CN", beijingOptions);
  document.getElementById("beijing-time").innerText = beijingStr;
}
updateClock();
setInterval(updateClock, 1000);

// ========== 新增：任意城市时区换算 ==========
function convertAnyCity() {
  const fromTz = document.getElementById("city-from").value;
  const toTz = document.getElementById("city-to").value;
  const dateStr = document.getElementById("input-date").value;
  const timeStr = document.getElementById("input-time").value;

  if (!dateStr || !timeStr) {
    document.getElementById("any-city-result").innerText = "请选择日期和时间";
    return;
  }

  const utcMs = zonedTimeToUtc(dateStr, timeStr, fromTz);
  const targetDate = new Date(utcMs);

  const fmt = new Intl.DateTimeFormat("zh-CN", {
    timeZone: toTz,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  document.getElementById("any-city-result").innerText = fmt.format(targetDate);
}

// 把【某个时区的本地时间】转成UTC时间戳（自动处理夏令时）
function zonedTimeToUtc(dateStr, timeStr, timeZone) {
  const targetMs = Date.parse(dateStr + "T" + timeStr + ":00Z");
  let utcMs = targetMs;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).formatToParts(new Date(utcMs));
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });
    const localAsUtc = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour % 24, +map.minute, +map.second);
    utcMs = targetMs - (localAsUtc - utcMs);
  }
  return utcMs;
}