// 内置常用城市 IANA时区
const cityList = [
    {name:"多伦多",tz:"America/Toronto"},
    {name:"北京",tz:"Asia/Shanghai"},
    {name:"纽约",tz:"America/New_York"},
    {name:"伦敦",tz:"Europe/London"},
    {name:"东京",tz:"Asia/Tokyo"},
    {name:"悉尼",tz:"Australia/Sydney"},
    {name:"洛杉矶",tz:"America/Los_Angeles"},
    {name:"迪拜",tz:"Asia/Dubai"},
    {name:"巴黎",tz:"Europe/Paris"},
    {name:"新加坡",tz:"Asia/Singapore"},
];

// 全局容器
const targetListEl = document.getElementById("targetList");
const addBtn = document.getElementById("addTargetBtn");
const calcBtn = document.getElementById("calcBtn");
const resultBox = document.getElementById("resultBox");
const sourceSearchInput = document.getElementById("sourceSearchCity");
let targetCount = 0;
const MAX_TARGET = 10;
let resultClockTimer = null;

// ========== 实时顶部时钟 ==========
function updateLiveClock(){
    const now = new Date();
    document.getElementById("torontoTime").innerText = new Intl.DateTimeFormat('zh-CN',{timeZone:"America/Toronto",hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(now);
    document.getElementById("beijingTime").innerText = new Intl.DateTimeFormat('zh-CN',{timeZone:"Asia/Shanghai",hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(now);
}
setInterval(updateLiveClock,1000);
updateLiveClock();


// ========== Open-Meteo API：城市搜索，获取经纬度+时区 ==========
async function searchCityGeo(cityName){
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=zh`);
    const json = await res.json();
    if(!json.results || json.results.length ===0) return null;
    return json.results[0];
}

// 【增加目标城市按钮】点击新增一行：下拉+搜索+删除
addBtn.onclick = function(){
    if(targetCount >= MAX_TARGET){
        alert("最多添加10个目标城市");
        return;
    }
    targetCount++;
    const div = document.createElement("div");
    div.className="target-row";
    div.innerHTML = `
        <select class="target-city-select">
            ${cityList.map(item=>`<option value="${item.tz}">${item.name}</option>`).join("")}
        </select>
        <input class="target-search" type="text" placeholder="🔍搜索城市，回车确认">
        <button class="del-row">删除</button>
    `;
    // 删除按钮
    div.querySelector(".del-row").onclick = function(){
        div.remove();
        targetCount--;
    }
    // ✅【修复重点：目标行搜索框】
    const searchInput = div.querySelector(".target-search");
    const selectEl = div.querySelector(".target-city-select");
    searchInput.onkeydown = async function(e){
        if(e.key !== "Enter") return;
        const keyword = searchInput.value.trim();
        if(!keyword) return;
        const cityGeo = await searchCityGeo(keyword);
        if(!cityGeo){
            alert("❌ 找不到该城市");
            return;
        }
        // 优先用API自带时区，这是关键修复！
        let tzId = cityGeo.timezone;
        // 同时在内置列表找匹配
        const matchCity = cityList.find(c=>c.name.toLowerCase() === cityGeo.name.toLowerCase());
        if(matchCity) tzId = matchCity.tz;

        // 动态新增option到下拉框，防止找不到值
        let hasOption = Array.from(selectEl.options).some(opt=>opt.value === tzId);
        if(!hasOption){
            const opt = new Option(cityGeo.name, tzId);
            selectEl.add(opt);
        }
        selectEl.value = tzId;
        searchInput.value = ""; // 清空搜索框
        alert(`✅ 已选中：${cityGeo.name}`);
    }
    targetListEl.appendChild(div);
}

// ✅起点搜索框回车搜索城市
sourceSearchInput.onkeydown = async function(e){
    if(e.key !== "Enter") return;
    const keyword = sourceSearchInput.value.trim();
    if(!keyword) return;
    const cityGeo = await searchCityGeo(keyword);
    if(!cityGeo){
        alert("❌找不到这个城市，请换关键词");
        return;
    }
    let tzId = cityGeo.timezone;
    const matchCity = cityList.find(c=>c.name.toLowerCase() === cityGeo.name.toLowerCase());
    if(matchCity) tzId = matchCity.tz;

    const sourceSelect = document.getElementById("sourceCitySelect");
    let hasOption = Array.from(sourceSelect.options).some(opt=>opt.value === tzId);
    if(!hasOption){
        const opt = new Option(cityGeo.name, tzId);
        sourceSelect.add(opt);
    }
    sourceSelect.value = tzId;
    sourceSearchInput.value = "";
    alert(`✅ 起点选中：${cityGeo.name}`);
}

// ========== 批量换算，生成【实时走动的时钟卡片】 ==========
calcBtn.onclick = function(){
    const dateVal = document.getElementById("sourceDate").value;
    const timeVal = document.getElementById("sourceTime").value;
    const sourceTz = document.getElementById("sourceCitySelect").value;
    if(!dateVal || !timeVal){
        alert("请选择日期和时间");
        return;
    }
    const sourceDateTimeStr = `${dateVal}T${timeVal}`;
    const sourceDateObj = new Date(sourceDateTimeStr);

    // 清空旧结果 + 停止旧定时器
    resultBox.innerHTML = "";
    if(resultClockTimer) clearInterval(resultClockTimer);

    const targetItems = document.querySelectorAll(".target-row");
    if(targetItems.length ===0){
        alert("请先添加目标城市");
        return;
    }

    // 渲染卡片
    targetItems.forEach(rowEl=>{
        const tz = rowEl.querySelector(".target-city-select").value;
        // 查找城市名称，找不到就直接显示时区字符串
        const cityInfo = cityList.find(c=>c.tz === tz);
        let cityName = cityInfo ? cityInfo.name : tz;
        // 如果下拉框自定义新增的选项，读取option文本
        const selectEl = rowEl.querySelector(".target-city-select");
        cityName = selectEl.options[selectEl.selectedIndex].text;

        const card = document.createElement("div");
        card.className="mini-clock";
        card.innerHTML = `
            <h4>${cityName}</h4>
            <div class="time" data-tz="${tz}" data-base="${sourceDateObj.getTime()}">--:--:--</div>
        `;
        resultBox.appendChild(card);
    })

    // 每秒刷新全部结果卡片时钟
    function refreshResultClocks(){
        const cards = resultBox.querySelectorAll(".time");
        cards.forEach(el=>{
            const tz = el.dataset.tz;
            const baseTs = Number(el.dataset.base);
            const nowOffset = Date.now() - baseTs;
            const targetTime = new Date(baseTs + nowOffset);
            el.innerText = new Intl.DateTimeFormat('zh-CN',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(targetTime);
        })
    }
    refreshResultClocks();
    resultClockTimer = setInterval(refreshResultClocks,1000);
}
