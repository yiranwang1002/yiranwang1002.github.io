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
    {name:"雷克雅未克",tz:"Atlantic/Reykjavik"},
    {name:"里约热内卢",tz:"America/Rio_de_Janeiro"},
    {name:"符拉迪沃斯托克",tz:"Asia/Vladivostok"},
];
const OTHER_FLAG = "__OTHER__";
const presetCities = [
    {name:"多伦多",tz:"America/Toronto"},
    {name:"北京",tz:"Asia/Shanghai"},
];

const targetListEl = document.getElementById("targetList");
const addBtn = document.getElementById("addTargetBtn");
const calcBtn = document.getElementById("calcBtn");
const resultBox = document.getElementById("resultBox");
const sourceSearchInput = document.getElementById("sourceSearchCity");
const sourceCitySelect = document.getElementById("sourceCitySelect");
let targetCount = 0;
const MAX_TARGET = 10;
let resultClockTimer = null;

// 顶部实时时钟
function updateLiveClock(){
    const now = new Date();
    document.getElementById("torontoTime").innerText = new Intl.DateTimeFormat('zh-CN',{timeZone:"America/Toronto",hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
    document.getElementById("beijingTime").innerText = new Intl.DateTimeFormat('zh-CN',{timeZone:"Asia/Shanghai",hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
    document.getElementById("torontoDate").innerText = new Intl.DateTimeFormat('zh-CN',{timeZone:"America/Toronto",year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    document.getElementById("beijingDate").innerText = new Intl.DateTimeFormat('zh-CN',{timeZone:"Asia/Shanghai",year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
setInterval(updateLiveClock,1000);
updateLiveClock();

// 中文转英文
async function cnToEn(text) {
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh|en`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.responseData && json.responseData.translatedText) {
            return json.responseData.translatedText.trim();
        }
        return null;
    }catch(err){
        console.log("翻译API调用失败",err);
        return null;
    }
}

// 城市搜索
async function searchCityGeo(rawCityName){
    let searchWord = rawCityName.trim();
    const enName = await cnToEn(searchWord);
    if(enName){
        searchWord = enName;
    }
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchWord)}&count=1&language=en`);
    const json = await res.json();
    if(!json.results || json.results.length ===0) return null;
    return json.results[0];
}

function buildSelectOptions(){
    let html = cityList.map(item=>`<option value="${item.tz}">${item.name}</option>`).join("");
    html += `<option value="${OTHER_FLAG}">其他（搜索城市）</option>`;
    return html;
}

// 添加目标城市行
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
    selectEl.onchange = function(){
        if(selectEl.value === OTHER_FLAG){
            searchInput.style.display = "block";
            searchInput.focus();
        }else{
            searchInput.style.display = "none";
        }
    }
    div.querySelector(".del-row").onclick = function(){
        div.remove();
        targetCount--;
    }
    searchInput.onkeydown = async function(e){
        if(e.key !== "Enter") return;
        const keyword = searchInput.value.trim();
        if(!keyword) return;
        const cityGeo = await searchCityGeo(keyword);
        if(!cityGeo){
            alert(`❌ 找不到城市「${keyword}」，尝试换名称`);
            return;
        }
        let tzId = cityGeo.timezone;
        const matchCity = cityList.find(c=>c.name.toLowerCase() === cityGeo.name.toLowerCase());
        if(matchCity) tzId = matchCity.tz;
        const opt = new Option(cityGeo.name, tzId);
        selectEl.add(opt,0);
        selectEl.value = tzId;
        searchInput.style.display = "none";
        searchInput.value = "";
        alert(`✅ 已添加并选中：${cityGeo.name}`);
    }
    targetListEl.appendChild(div);
}

// 起点下拉初始化
sourceCitySelect.innerHTML = buildSelectOptions();
sourceCitySelect.onchange = function(){
    if(sourceCitySelect.value === OTHER_FLAG){
        sourceSearchInput.style.display = "block";
        sourceSearchInput.focus();
    }else{
        sourceSearchInput.style.display = "none";
    }
}
sourceSearchInput.onkeydown = async function(e){
    if(e.key !== "Enter") return;
    const keyword = sourceSearchInput.value.trim();
    if(!keyword) return;
    const cityGeo = await searchCityGeo(keyword);
    if(!cityGeo){
        alert(`❌找不到城市「${keyword}」，尝试换关键词`);
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
sourceSearchInput.style.display = "none";

// 批量换算按钮
calcBtn.onclick = async function(){
    const dateVal = document.getElementById("sourceDate").value;
    const timeVal = document.getElementById("sourceTime").value;
    const sourceTz = sourceCitySelect.value;
    if(!dateVal || !timeVal){
        alert("请选择日期和时间");
        return;
    }
    if(sourceTz === OTHER_FLAG){
        const srcKeyword = sourceSearchInput.value.trim();
        if(!srcKeyword){
            alert("起点【其他】搜索框为空！请输入城市");
            return;
        }
        const cityGeo = await searchCityGeo(srcKeyword);
        if(!cityGeo){
            alert(`❌ 起点无法找到城市：${srcKeyword}`);
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
    }

    const sourceDateTimeStr = `${dateVal}T${timeVal}`;
    const sourceDateObj = new Date(sourceDateTimeStr);
    resultBox.innerHTML = "";
    if(resultClockTimer) clearInterval(resultClockTimer);

    const targetItems = document.querySelectorAll(".target-row");
    if(targetItems.length ===0){
        alert("请先添加目标城市");
        return;
    }

    for(let rowEl of targetItems){
        const selectEl = rowEl.querySelector(".target-city-select");
        const searchInput = rowEl.querySelector(".target-search");
        if(selectEl.value === OTHER_FLAG){
            const keyword = searchInput.value.trim();
            if(!keyword){
                alert("有一行【其他】搜索框是空的，请输入城市名");
                return;
            }
            const cityGeo = await searchCityGeo(keyword);
            if(!cityGeo){
                alert(`❌ 找不到城市：${keyword}`);
                return;
            }
            let tzId = cityGeo.timezone;
            const matchCity = cityList.find(c=>c.name.toLowerCase() === cityGeo.name.toLowerCase());
            if(matchCity) tzId = matchCity.tz;
            const opt = new Option(cityGeo.name, tzId);
            selectEl.add(opt,0);
            selectEl.value = tzId;
            searchInput.style.display = "none";
            searchInput.value = "";
        }
    }

    // 渲染预设城市卡片
    presetCities.forEach(city=>{
        const card = document.createElement("div");
        card.className="mini-clock";
        card.innerHTML = `
            <h4>${city.name}</h4>
            <div class="mini-date" data-tz="${city.tz}" data-base="${sourceDateObj.getTime()}">--</div>
            <div class="time" data-tz="${city.tz}" data-base="${sourceDateObj.getTime()}">--:--:--</div>
        `;
        resultBox.appendChild(card);
    });

    // 渲染用户添加的目标城市卡片
    targetItems.forEach(rowEl=>{
        const selectEl = rowEl.querySelector(".target-city-select");
        const tz = selectEl.value;
        const cityName = selectEl.options[selectEl.selectedIndex].text;
        const card = document.createElement("div");
        card.className="mini-clock";
        card.innerHTML = `
            <h4>${cityName}</h4>
            <div class="mini-date" data-tz="${tz}" data-base="${sourceDateObj.getTime()}">--</div>
            <div class="time" data-tz="${tz}" data-base="${sourceDateObj.getTime()}">--:--:--</div>
        `;
        resultBox.appendChild(card);
    });

    // 刷新时间+日期
    function refreshResultClocks(){
        const timeEls = resultBox.querySelectorAll(".time");
        const dateEls = resultBox.querySelectorAll(".mini-date");

        timeEls.forEach(function(el){
            var tz = el.getAttribute("data-tz");
            var baseTs = Number(el.getAttribute("data-base"));
            var nowOffset = Date.now() - baseTs;
            var targetTime = new Date(baseTs + nowOffset);
            el.innerText = new Intl.DateTimeFormat('zh-CN', {
                timeZone: tz,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(targetTime);
        });

        dateEls.forEach(function(el){
            var tz = el.getAttribute("data-tz");
            var baseTs = Number(el.getAttribute("data-base"));
            var nowOffset = Date.now() - baseTs;
            var targetTime = new Date(baseTs + nowOffset);
            el.innerText = new Intl.DateTimeFormat('zh-CN', {
                timeZone: tz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(targetTime);
        });
    }

    console.log("开始刷新结果卡片");
    refreshResultClocks();
    resultClockTimer = setInterval(refreshResultClocks,1000);
}
