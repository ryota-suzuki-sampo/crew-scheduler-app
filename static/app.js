function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

const shipColors = {}; // ship_id -> color_code

async function loadShipColors() {
  const res = await fetch("/ships");
  const data = await res.json();
  data.forEach(ship => {
    shipColors[ship.id] = ship.color_code;
  });
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

  // ヘッダー行
  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `<th>船員名</th><th>船名</th>`;
  for (let d = 1; d <= daysInMonth; d++) {
    headerRow.innerHTML += `<th>${d}</th>`;
  }
  tableHead.appendChild(headerRow);

  // 各行
  data.forEach(item => {
    const onboard = new Date(item.onboard_date);
    const offboard = item.offboard_date ? new Date(item.offboard_date) : null;
    const row = document.createElement("tr");
    row.innerHTML = `<td>${item.crew_name}</td><td>${item.ship_name}</td>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const cell = document.createElement("td");
      if (onboard <= cellDate && (!offboard || cellDate <= offboard)) {
        cell.style.backgroundColor = shipColors[item.ship_id] || "#ddd";
      }
      row.appendChild(cell);
    }
    tableBody.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const yearSel = document.getElementById("yearSelect");
  const monthSel = document.getElementById("monthSelect");
  const reloadBtn = document.getElementById("reloadBtn");

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();

  // 年セレクト初期化
  for (let y = thisYear - 2; y <= thisYear + 2; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === thisYear) opt.selected = true;
    yearSel.appendChild(opt);
  }

  // 月セレクト初期化
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
