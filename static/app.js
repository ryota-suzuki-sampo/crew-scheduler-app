// static/app.js（完全版：色付き + D&D + POST）

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

const shipColors = {}; // ship_id -> color_code
let shipList = [];
let draggedCrewName = null;
let draggedStart = null;

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
          draggedCrewName = crewName;
          draggedStart = cellDate;
        });
        cell.addEventListener("dragover", e => e.preventDefault());
        cell.addEventListener("drop", () => handleDrop(cellDate, crewName));
      }

      row.appendChild(cell);
    }
    tableBody.appendChild(row);
  });
}

function handleDrop(dropDate, crewName) {
  const start = draggedStart < dropDate ? draggedStart : dropDate;
  const end = draggedStart > dropDate ? draggedStart : dropDate;

  document.getElementById("modal-crew").textContent = `船員: ${crewName}`;
  document.getElementById("modal-period").textContent = `期間: ${start.toLocaleDateString()} ～ ${end.toLocaleDateString()}`;
  const modal = new bootstrap.Modal(document.getElementById("assignModal"));
  modal.show();

  document.getElementById("submitAssignment").onclick = async () => {
    const shipId = document.getElementById("shipSelect").value;
    const status = document.getElementById("statusSelect").value;

    const crewRes = await fetch("/crew_members");
    const crewList = await crewRes.json();
    const match = crewList.find(m => `${m.last_name} ${m.first_name}` === crewName);
    if (!match) return alert("船員が見つかりません");

    await fetch("/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crew_id: match.id,
        ship_id: parseInt(shipId),
        onboard_date: start.toISOString().split("T")[0],
        offboard_date: end.toISOString().split("T")[0],
        status
      })
    });

    modal.hide();
    location.reload();
  };
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