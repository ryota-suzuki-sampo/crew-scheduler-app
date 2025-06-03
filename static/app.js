// static/app.js

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

const shipColorMap = new Map();

async function loadShipColors() {
  const res = await fetch("/ships");
  const ships = await res.json();
  ships.forEach(ship => {
    shipColorMap.set(ship.name, ship.color_code || "#dddddd");
  });
}

async function loadAssignments(year, month) {
  const table = document.getElementById("assignment-table");
  table.innerHTML = ""; // クリア

  const daysInMonth = getDaysInMonth(year, month);

  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  headerRow.insertCell().textContent = "船員名";
  headerRow.insertCell().textContent = "船名";
  for (let d = 1; d <= daysInMonth; d++) {
    headerRow.insertCell().textContent = d;
  }

  const res = await fetch("/assignments");
  const data = await res.json();

  const tbody = table.createTBody();
  for (const item of data) {
    const row = tbody.insertRow();
    row.insertCell().textContent = item.crew_name;
    row.insertCell().textContent = item.ship_name;

    const onboard = new Date(item.onboard_date);
    const offboard = item.offboard_date ? new Date(item.offboard_date) : null;
    const color = shipColorMap.get(item.ship_name) || "#dddddd";

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const cell = row.insertCell();

      if (onboard <= cellDate && (!offboard || cellDate <= offboard)) {
        cell.style.backgroundColor = color;
      }
    }
  }
}

function setupSelectors() {
  const yearSelect = document.getElementById("year-select");
  const monthSelect = document.getElementById("month-select");
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  for (let m = 0; m < 12; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m + 1;
    if (m === currentMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  }

  document.getElementById("reload-btn").addEventListener("click", () => {
    const selectedYear = parseInt(yearSelect.value);
    const selectedMonth = parseInt(monthSelect.value);
    loadAssignments(selectedYear, selectedMonth);
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadShipColors();
  setupSelectors();
  const now = new Date();
  loadAssignments(now.getFullYear(), now.getMonth());
});
