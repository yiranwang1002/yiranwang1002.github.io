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
const OTHER_FLAG = "__OTHER__"; // 标记：其他，开启搜索

// 全局容器
const targetListEl = document.getElementById("targetList");
const addBtn = document.getElementById("addTargetBtn");
const calcBtn = document.getElementById("calcBtn");
const resultBox = document.getElementById("resultBox");
const sourceSearchInput = document.getElementById("sourceSearchCity");
const sourceCitySelect = document.getElementById("sourceCitySelect");

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


// ========== Open-Meteo API：城市搜索 ==========
async function searchCityGeo(cityName){
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=zh`);
    const json = await res.json();
    if(!json.results || json.results.length ===0) return null;
    return json.results[0];
}

// 生成下拉选项HTML，末尾追加【其他（搜索城市）】
function buildSelectOptions(){
    let html = cityList.map(item=>`<option value="${item.tz}">${item.name}</option>`).join("");
    html += `<option value="${OTHER_FLAG}">其他（搜索城市）</option>`;
    return html;
}

// ========== 【增加目标城市行】 核心IF逻辑 ==========
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
            ${buildSelectOptions()}
        </select>
        <input class="target-search" type="text" placeholder="🔍输入城市，回车搜索" style="display:none;">
        <button class="del-row">删除</button>
    `;
    const selectEl = div.querySelector(".target-city-select");
    const searchInput = div.querySelector(".target-search");

    // 下拉切换监听：IF 判断，控制搜索框显示隐藏
    selectEl.onchange = function(){
        if(selectEl.value === OTHER_FLAG){
            searchInput.style.display = "block";
            searchInput.focus();
        }else{
            searchInput.style.display = "none";
        }
    }

    // 删除按钮
    div.querySelector(".del-row").onclick = function(){
        div.remove();
        targetCount--;
    }

    // 搜索框回车联网查询（仅在选【其他】时才会出现）
    searchInput.onkeydown = async function(e){
        if(e.key !== "Enter") return;
        const keyword = searchInput.value.trim();
        if(!keyword) return;
        const cityGeo = await searchCityGeo(keyword);
        if(!cityGeo){
            alert("❌ 找不到该城市");
            return;
        }
        let tzId = cityGeo.timezone;
        const matchCity = cityList.find(c=>c.name.toLowerCase() === cityGeo.name.toLowerCase());
        if(matchCity) tzId = matchCity.tz;

        // 新增搜索出来的城市到下拉选项
        const opt = new Option(cityGeo.name, tzId);
        selectEl.add(opt,0); // 插到最前面
        selectEl.value = tzId;
        searchInput.style.display = "none"; // 搜索成功，隐藏搜索框
        searchInput.value = "";
        alert(`✅ 已添加并选中：${cityGeo.name}`);
    }
    targetListEl.appendChild(div);
}

// ========== 起点下拉，同样增加【其他】选项 + IF控制搜索框 ==========
// 重构建起点下拉
sourceCitySelect.innerHTML = buildSelectOptions();
// 起点下拉切换事件
sourceCitySelect.onchange = function(){
    if(sourceCitySelect.value === OTHER_FLAG){
        sourceSearchInput.style.display = "block";
        sourceSearchInput.focus();
    }else{
        sourceSearchInput.style.display = "none";
    }
}
// 起点搜索回车逻辑
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

    const opt = new Option(cityGeo.name, tzId);
    sourceCitySelect.add(opt,0);
    sourceCitySelect.value = tzId;
    sourceSearchInput.style.display = "none";
    sourceSearchInput.value = "";
    alert(`✅ 起点选中：${cityGeo.name}`);
}
// 页面初始：起点搜索框默认隐藏
sourceSearchInput.style.display = "none";

// ========== 批量换算，生成【实时走动的时钟卡片】 ==========
calcBtn.onclick = function(){
    const dateVal = document.getElementById("sourceDate").value;
    const timeVal = document.getElementById("sourceTime").value;
    const sourceTz = sourceCitySelect.value;
    if(!dateVal || !timeVal){
        alert("请选择日期和时间");
        return;
    }
    if(sourceTz === OTHER_FLAG){
        alert("请先搜索并选择起点城市！");
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

    // 遍历所有目标行，校验不能停留在【其他】
    for(let rowEl of targetItems){
        const tz = rowEl.querySelector(".target-city-select").value;
        if(tz === OTHER_FLAG){
            alert("请完成目标城市搜索，不要停留在【其他（搜索城市）】");
            return;
        }
    }

    // 渲染卡片
    targetItems.forEach(rowEl=>{
        const selectEl = rowEl.querySelector(".target-city-select");
        const tz = selectEl.value;
        const cityName = selectEl.options[selectEl.selectedIndex].text;

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
