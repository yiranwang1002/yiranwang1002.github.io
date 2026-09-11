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


// ========== Open-Meteo API：城市搜索，获取经纬度 ==========
async function searchCityGeo(cityName){
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=zh`);
    const json = await res.json();
    if(!json.results || json.results.length ===0) return null;
    return json.results[0];
}

// 根据经纬度自动猜测IANA时区
function getIanaTimezone(lat,lon){
    try {
        const intl = Intl.DateTimeFormat(undefined, {timeZone: Intl.supportedValuesOf('timeZone').find(tz=>true)});
        // 简化方案：使用内置时区查找，搭配地理API结果名称
        return null;
    }catch(e){return null;}
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
        <input class="target-search" type="text" placeholder="🔍搜索城市">
        <button class="del-row">删除</button>
    `;
    // 删除按钮
    div.querySelector(".del-row").onclick = function(){
        div.remove();
        targetCount--;
    }
    // 目标行的搜索框 回车搜索城市
    const searchInput = div.querySelector(".target-search");
    searchInput.onkeydown = async function(e){
        if(e.key !== "Enter") return;
        const cityGeo = await searchCityGeo(searchInput.value.trim());
        if(!cityGeo){
            alert("找不到该城市");
            return;
        }
        // 找到匹配时区，优先匹配内置列表
        const matchCity = cityList.find(c=>c.name.toLowerCase() === cityGeo.name.toLowerCase());
        const tzId = matchCity ? matchCity.tz : cityGeo.timezone;
        if(tzId){
            div.querySelector(".target-city-select").value = tzId;
        }else{
            alert(`找到了城市${cityGeo.name}，但未识别时区`);
        }
    }
    targetListEl.appendChild(div);
}

// 起点搜索框回车搜索城市
sourceSearchInput.onkeydown = async function(e){
    if(e.key !== "Enter") return;
    const cityGeo = await searchCityGeo(sourceSearchInput.value.trim());
    if(!cityGeo){
        alert("找不到这个城市，请换关键词");
        return;
    }
    const matchCity = cityList.find(c=>c.name.toLowerCase() === cityGeo.name.toLowerCase());
    const tzId = matchCity ? matchCity.tz : cityGeo.timezone;
    if(tzId) document.getElementById("sourceCitySelect").value = tzId;
    alert(`已选中城市：${cityGeo.name}`);
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
        const cityInfo = cityList.find(c=>c.tz === tz);
        const cityName = cityInfo ? cityInfo.name : tz;

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
