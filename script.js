// 城市时区选项
const tzOptions = [
    {name:"多伦多", offset:-4},
    {name:"北京", offset:8},
    {name:"伦敦", offset:0},
    {name:"纽约", offset:-5},
    {name:"东京", offset:9}
];

// 实时时钟
function updateLiveClock(){
    const now = new Date();
    // 多伦多 UTC-4
    const toronto = new Date(now.toLocaleString("en-US",{timeZone:"America/Toronto"}));
    document.getElementById("torontoTime").innerText = toronto.toLocaleTimeString();
    // 北京 UTC+8
    const beijing = new Date(now.toLocaleString("en-US",{timeZone:"Asia/Shanghai"}));
    document.getElementById("beijingTime").innerText = beijing.toLocaleTimeString();
}
setInterval(updateLiveClock,1000);
updateLiveClock();

const targetListEl = document.getElementById("targetList");
const addBtn = document.getElementById("addTargetBtn");
const calcBtn = document.getElementById("calcBtn");
const resultBox = document.getElementById("resultBox");
let targetCount = 0;
const MAX_TARGET = 10;

// ✅【增加目标城市按钮 修复】
addBtn.onclick = function(){
    if(targetCount >= MAX_TARGET){
        alert("最多添加10个目标城市");
        return;
    }
    targetCount++;
    const div = document.createElement("div");
    div.className="row";
    div.innerHTML = `
        <select class="target-city">
            ${tzOptions.map(item=>`<option value="${item.offset}">${item.name}</option>`).join("")}
        </select>
        <button class="del-row">删除</button>
    `;
    div.querySelector(".del-row").onclick = function(){
        div.remove();
        targetCount--;
    }
    targetListEl.appendChild(div);
}

// 批量换算
calcBtn.onclick = function(){
    const dateVal = document.getElementById("sourceDate").value;
    const timeVal = document.getElementById("sourceTime").value;
    const sourceOffset = Number(document.getElementById("sourceCity").value);
    if(!dateVal || !timeVal){
        alert("请选择日期和时间");
        return;
    }
    const sourceLocal = new Date(`${dateVal}T${timeVal}`);
    const sourceUtcTs = sourceLocal.getTime() - sourceOffset * 3600000;

    resultBox.innerHTML = "";
    const items = document.querySelectorAll(".target-city");
    items.forEach(sel=>{
        const tzOffset = Number(sel.value);
        const targetTime = new Date(sourceUtcTs + tzOffset * 3600000);
        const name = tzOptions.find(x=>x.offset===tzOffset).name;
        resultBox.innerHTML += `
        <div class="mini-clock">
            <h4>${name}</h4>
            <div class="time">${targetTime.toLocaleString()}</div>
        </div>
        `
    })
}
