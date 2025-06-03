// static/app.js

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

const shipColors = {};
let shipList = [];
let draggedAssignment = null;
let draggedField = null;

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

  // 日付ヘッダー
  const headerRow = document.createElement("tr");

  headerRow.innerHTML = `<th>船員名</th><th>船名</th>`;
  for (let d = 1; d <= daysInMonth; d++) {
    headerRow.innerHTML += `<th>${d}</th>`;
  }
  tableHead.appendChild(headerRow);

  data.forEach(item => {
    const onboard = new Date(item.onboard_date);
    const offboard = item.offboard_date ? new Date(item.offboard_date) : null;
    const row = document.createElement("tr");
    row.innerHTML = `<td>${item.crew_name}</td><td>${item.ship_name}</td>`;
    const crewName = item.crew_name;

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const cell = document.createElement("td");
      cell.className = "assignment-cell";
      cell.dataset.crew = crewName;
      cell.dataset.date = cellDate.toISOString().split("T")[0];

      if (cellDate.toDateString() === onboard.toDateString()) {
        cell.style.backgroundColor = shipColors[item.ship_name] || "#dddddd";
        cell.draggable = true;
        cell.dataset.dragField = "onboard_date";
        cell.addEventListener("dragstart", () => {
          draggedAssignment = item;
          draggedField = "onboard_date";
        });
      } else if (offboard && cellDate.toDateString() === offboard.toDateString()) {
        cell.style.backgroundColor = shipColors[item.ship_name] || "#dddddd";
        cell.draggable = true;
        cell.dataset.dragField = "offboard_date";
        cell.addEventListener("dragstart", () => {
          draggedAssignment = item;
          draggedField = "offboard_date";
        });
      } else if (onboard <= cellDate && (!offboard || cellDate <= offboard)) {
        cell.style.backgroundColor = shipColors[item.ship_name] || "#eeeeee";
      }

      cell.addEventListener("dragover", e => e.preventDefault());
      cell.addEventListener("drop", () => handleDrop(cellDate));
      row.appendChild(cell);
    }
    tableBody.appendChild(row);
  });
}

async function handleDrop(dropDate) {
  if (!draggedAssignment || !draggedField) return;

  const updatedAssignment = {
    ...draggedAssignment,
    onboard_date: draggedAssignment.onboard_date,
    offboard_date: draggedAssignment.offboard_date
  };

  const dropDateStr = dropDate.toISOString().split("T")[0];
  const onboardStr = new Date(draggedAssignment.onboard_date).toISOString().split("T")[0];
  const offboardStr = draggedAssignment.offboard_date
    ? new Date(draggedAssignment.offboard_date).toISOString().split("T")[0]
    : null;

  if (draggedField === "onboard_date" && dropDateStr !== onboardStr) {
    updatedAssignment.onboard_date = dropDateStr;
  } else if (draggedField === "offboard_date" && dropDateStr !== offboardStr) {
    updatedAssignment.offboard_date = dropDateStr;
  } else {
    return; // 無効なドロップ
  }

  try {
    // POST新規
    const postRes = await fetch("/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crew_id: updatedAssignment.crew_id,
        ship_id: updatedAssignment.ship_id,
        onboard_date: updatedAssignment.onboard_date,
        offboard_date: updatedAssignment.offboard_date,
        status: updatedAssignment.status
      })
    });

    if (!postRes.ok) {
      const error = await postRes.json();
      console.error("POSTエラー:", error);
      alert("登録に失敗しました: " + (error.error || postRes.statusText));
      return;
    }

    // DELETE旧データ
    await fetch(`/assignments/${draggedAssignment.id}`, {
      method: "DELETE"
    });

    location.reload();
  } catch (err) {
    console.error("通信エラー:", err);
    alert("サーバーとの通信に失敗しました。");
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
