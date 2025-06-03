// static/app.js（ドラッグで乗船日変更対応）

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

const shipColors = {}; // ship_name -> color_code
let shipList = [];
let draggedAssignment = null;

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
  const table = document.getElementById("assignment-table");
  table.innerHTML = "";
  table.innerHTML = `<thead></thead><tbody id="assignment-table-body"></tbody>`;

  const tableHead = table.querySelector("thead");
  const tableBody = table.querySelector("#assignment-table-body");

  const daysInMonth = getDaysInMonth(year, month);
  const res = await fetch("/assignments");
  const data = await res.json();

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

      if (onboard <= cellDate && (!offboard || cellDate <= offboard)) {
        cell.style.backgroundColor = shipColors[item.ship_name] || "#dddddd";
        cell.draggable = true;
        cell.addEventListener("dragstart", () => {
          draggedAssignment = {
            id: item.id,
            crew_id: item.crew_id,
            ship_id: item.ship_id,
            onboard_date: item.onboard_date,
            offboard_date: item.offboard_date,
            status: item.status
          };
        });
      }

      cell.addEventListener("dragover", e => e.preventDefault());
      cell.addEventListener("drop", () => handleDrop(cellDate));
      row.appendChild(cell);
    }
    tableBody.appendChild(row);
  });
}

async function handleDrop(dropDate) {
  if (!draggedAssignment) return;

  const origOnboard = new Date(draggedAssignment.onboard_date);
  const origOffboard = draggedAssignment.offboard_date ? new Date(draggedAssignment.offboard_date) : null;
  const duration = origOffboard ? (origOffboard - origOnboard) / (1000 * 60 * 60 * 24) : 0;
  const newOnboard = dropDate;
  const newOffboard = duration ? new Date(newOnboard.getTime() + duration * 86400000) : null;

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
      alert("登録に失敗しました: " + (error.error || postRes.statusText));
      return;
    }

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
  const yearSel = document.getElementById("yearSelect") || document.getElementById("year-select");
  const monthSel = document.getElementById("monthSelect") || document.getElementById("month-select");
  const reloadBtn = document.getElementById("reloadBtn") || document.getElementById("reload-btn");

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
