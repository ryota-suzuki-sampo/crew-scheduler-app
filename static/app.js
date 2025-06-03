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

  const daysInMonth = getDaysInMonth(year, month);
  const res = await fetch("/assignments");
  const data = await res.json();

  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `<th>船員名</th><th>船名</th>`;
  for (let d = 1; d <= daysInMonth; d++) {
    headerRow.innerHTML += `<th>${d}</th>`;
  }
  tableHead.appendChild(headerRow);

  // 日付順、ship_id順で並び替え（視認性向上）
  data.sort((a, b) => a.ship_id - b.ship_id);

  data.forEach(item => {
    const onboard = new Date(item.onboard_date);
    const offboard = item.offboard_date ? new Date(item.offboard_date) : null;

    const row = document.createElement("tr");
    row.innerHTML = `<td>${item.crew_name}</td><td>${item.ship_name}</td>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const cell = document.createElement("td");
      cell.className = "assignment-cell";
      const onboardStr = new Date(item.onboard_date).toISOString().split("T")[0];
      const offboardStr = item.offboard_date
        ? new Date(item.offboard_date).toISOString().split("T")[0]
        : null;
      const cellStr = cellDate.toISOString().split("T")[0];
      cell.dataset.date = cellStr;

              console.log(`cellStr: ${cellStr}, onboardStr: ${onboardStr}, offboardStr: ${offboardStr}`);

      if (onboard <= cellDate && (!offboard || cellDate <= offboard)) {
        cell.style.backgroundColor = shipColors[item.ship_name] || "#dddddd";
        // 乗船日 or 下船日 の場合だけドラッグ許可
        if (cellStr === onboardStr || cellStr === offboardStr) {
          cell.draggable = true;
          cell.addEventListener("dragstart", () => {
            draggedAssignment = item;
            draggedType = (cellStr === onboardStr) ? "onboard" : "offboard";
          });
        }
      }

      cell.addEventListener("dragover", e => e.preventDefault());
      cell.addEventListener("drop", () => handleDrop(cellDate));
      row.appendChild(cell);
    }

    tableBody.appendChild(row);
  });
}

async function handleDrop(dropDate) {
  if (!draggedAssignment || !draggedType) return;

  const onboard = new Date(draggedAssignment.onboard_date);
  const offboard = draggedAssignment.offboard_date ? new Date(draggedAssignment.offboard_date) : null;

  // 更新対象が乗船日 or 下船日かによって設定値を切り替える
  let newOnboard = onboard;
  let newOffboard = offboard;

  if (draggedType === "onboard") {
    newOnboard = dropDate;
  } else if (draggedType === "offboard") {
    newOffboard = dropDate;
  } else {
    return; // それ以外は無視
  }

  const postData = {
    crew_id: draggedAssignment.crew_id,
    ship_id: draggedAssignment.ship_id,
    onboard_date: newOnboard.toISOString().split("T")[0],
    offboard_date: newOffboard ? newOffboard.toISOString().split("T")[0] : null,
    status: draggedAssignment.status
  };

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

    location.reload();
  } catch (err) {
    console.error("通信エラー:", err);
    alert("サーバーエラーが発生しました");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const yearSel = document.getElementById("yearSelect");
  const monthSel = document.getElementById("monthSelect");
  const reloadBtn = document.getElementById("reloadBtn");

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();

  for (let y = thisYear - 2; y <= thisYear + 2; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === thisYear) opt.selected = true;
    yearSel.appendChild(opt);
  }

  for (let m = 0; m < 12; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m + 1;
    if (m === thisMonth) opt.selected = true;
    monthSel.appendChild(opt);
  }

  await loadShipColors();
  await loadAssignments(thisYear, thisMonth);

  reloadBtn.addEventListener("click", () => {
    const year = parseInt(yearSel.value);
    const month = parseInt(monthSel.value);
    loadAssignments(year, month);
  });
});
