// static/app.js

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

const shipColors = {};
let shipList = [];
let draggedAssignment = null;
let draggedType = null;

async function loadShipColors() {
  const res = await fetch("/ships");
  const data = await res.json();
  shipList = data;
  data.forEach(ship => {
    shipColors[ship.name] = ship.color_code || "#cccccc";
  });

  const shipSelect = document.getElementById("shipSelect");
  if (shipSelect) {
    shipSelect.innerHTML = "";
    data.forEach(ship => {
      const opt = document.createElement("option");
      opt.value = ship.id;
      opt.textContent = ship.name;
      shipSelect.appendChild(opt);
    });
  }
}
async function loadAssignments(year, month) {
  const tableHead = document.querySelector("#assignment-table thead");
  const tableBody = document.querySelector("#assignment-table-body");
  if (!tableHead || !tableBody) return;

  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  const stepDays = viewSpan === 1 ? 1 : viewSpan === 3 ? 3 : viewSpan === 6 ? 6 : 10; // 月内の表示単位（日）
  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `<th>船員名</th><th>船名</th>`;

  const displayDates = []; // 表示用の日付保持

  for (let offset = 0; offset < viewSpan; offset++) {
    const tempDate = new Date(year, month + offset, 1);
    const days = getDaysInMonth(tempDate.getFullYear(), tempDate.getMonth());

    for (let d = 1; d <= days; d += stepDays) {
      const cellDate = new Date(tempDate.getFullYear(), tempDate.getMonth(), d);
      const label = `${cellDate.getMonth() + 1}/${cellDate.getDate()}`;
      headerRow.innerHTML += `<th>${label}</th>`;
      displayDates.push(cellDate);
    }
  }

  tableHead.appendChild(headerRow);

  const res = await fetch("/assignments");
  const data = await res.json();
  data.sort((a, b) => a.ship_id - b.ship_id);

  data.forEach(item => {
    const onboard = parseUTCDateStringAsLocalDate(item.onboard_date);
    const offboardRaw = item.offboard_date ? parseUTCDateStringAsLocalDate(item.offboard_date) : null;
    const offboard = offboardRaw || new Date(year, month + viewSpan, 0);
    const onboardStr = toDateStringYMD(onboard);
    const offboardStr = item.offboard_date ? toDateStringYMD(new Date(item.offboard_date)) : null;

    const row = document.createElement("tr");
    row.innerHTML = `<td>${item.crew_name}</td><td>${item.ship_name}</td>`;

    displayDates.forEach(cellDate => {
      const cell = document.createElement("td");
      cell.className = "assignment-cell";
      const cellStr = toDateStringYMD(cellDate);
      cell.dataset.date = cellStr;

      if (onboard <= cellDate && (!item.offboard_date || cellDate <= offboard)) {
        cell.style.backgroundColor = shipColors[item.ship_name] || "#dddddd";
      }

      const isOnboard = cellStr === onboardStr;
      const isOffboard = cellStr === offboardStr;

      if (isOnboard || isOffboard) {
        cell.draggable = true;
        cell.addEventListener("dragstart", () => {
          draggedAssignment = item;
          draggedType = isOnboard ? "onboard" : "offboard";
        });
      }

      cell.addEventListener("dragover", e => e.preventDefault());
      cell.addEventListener("drop", () => handleDrop(cellDate));
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });
}

document.getElementById("prevBtn").addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  loadAssignments(currentYear, currentMonth);
});

document.getElementById("nextBtn").addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  loadAssignments(currentYear, currentMonth);
});

document.getElementById("view-span").addEventListener("change", e => {
  viewSpan = parseInt(e.target.value, 10);
  loadAssignments(currentYear, currentMonth);
});

// 初回読み込み
//loadAssignments(currentYear, currentMonth);
function parseUTCDateStringAsLocalDate(dateString) {
    if (!dateString) return null;
    // YYYY-MM-DD を想定
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 月は0から始まる
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day); // ローカルタイムゾーンの0時で Date オブジェクトを生成
    }
    return new Date(dateString); // フォールバック（元の挙動に近いが推奨しない）
}

function toDateStringYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function handleDrop(dropDate) {
  if (!draggedAssignment || !draggedType) return;

  const onboard = new Date(draggedAssignment.onboard_date);
  const offboard = draggedAssignment.offboard_date ? new Date(draggedAssignment.offboard_date) : null;

  // 更新対象が乗船日 or 下船日かによって設定値を切り替える
  let newOnboard = onboard;
  let newOffboard = offboard;

  console.log(`draggedType: ${draggedType}, onboard_date: ${onboard}, offboard_date: ${offboard}`);
  console.log(`newOnboard: ${newOnboard}, newOffboard: ${newOffboard}, dropDate: ${dropDate}`);
  console.log(`status: ${draggedAssignment.status}, crew_id: ${draggedAssignment.crew_id}, ship_id: ${draggedAssignment.ship_id}`);

  if (draggedType === "onboard") {
    newOnboard = dropDate;
  } else if (draggedType === "offboard") {
    newOffboard = dropDate;
    console.log(`newOffboard set to dropDate: ${newOffboard}`);
  } else {
    return; // それ以外は無視
  }

  const formatDate = (date) =>
    date ? date.toLocaleDateString("sv-SE") : null; // 'YYYY-MM-DD'

  const postData = {
    crew_id: draggedAssignment.crew_id,
    ship_id: draggedAssignment.ship_id,
    onboard_date: formatDate(newOnboard),
    offboard_date: newOffboard ? formatDate(newOffboard) : null,
    status: draggedAssignment.status
  };

  console.log("POST data:", postData);


  try {
    const postRes = await fetch("/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postData)
    });

    if (!postRes.ok) {
      const error = await postRes.json();
      console.error("POSTエラー:", error);
      alert("登録失敗: " + (error.error || postRes.statusText));
      return;
    }

    await fetch(`/assignments/${draggedAssignment.id}`, {
      method: "DELETE"
    });

    //location.reload();
    const year = parseInt(document.getElementById("yearSelect").value);
    const month = parseInt(document.getElementById("monthSelect").value);
    await loadAssignments(year, month);
    draggedAssignment = null;
    draggedType = null;
  } catch (err) {
    console.error("通信エラー:", err);
    alert("サーバーエラーが発生しました");
  }
}

let currentYear, currentMonth, viewSpan = 1;

document.addEventListener("DOMContentLoaded", async () => {
  const yearSel = document.getElementById("yearSelect");
  const monthSel = document.getElementById("monthSelect");
  const viewSel = document.getElementById("viewSpanSelect");

  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();

  // 初期選択
  viewSel.value = "1";
  viewSel.addEventListener("change", async () => {
    viewSpan = parseInt(viewSel.value);
    await loadAssignments(currentYear, currentMonth);
  });

  document.getElementById("prevBtn").addEventListener("click", async () => {
    currentMonth -= viewSpan;
    if (currentMonth < 0) {
      currentYear -= 1;
      currentMonth += 12;
    }
    await loadAssignments(currentYear, currentMonth);
  });

  document.getElementById("nextBtn").addEventListener("click", async () => {
    currentMonth += viewSpan;
    if (currentMonth > 11) {
      currentYear += 1;
      currentMonth -= 12;
    }
    await loadAssignments(currentYear, currentMonth);
  });

  await loadShipColors();
  await loadAssignments(currentYear, currentMonth);
});
