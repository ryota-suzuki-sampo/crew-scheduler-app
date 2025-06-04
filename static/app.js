// static/app.js

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function toDateStringYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseUTCDateStringAsLocalDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}
const shipColors = {};
let shipList = [];
let draggedAssignment = null;
let draggedType = null;
let viewSpan = 1;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

async function loadShipColors() {
  const res = await fetch("/ships");
  const data = await res.json();
  shipList = data;
  data.forEach(ship => {
    shipColors[ship.name] = ship.color_code || "#cccccc";
  });
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
  // 表示範囲全体の日付取得
  const dateList = [];
  for (let offset = 0; offset < viewSpan; offset++) {
    const tempDate = new Date(year, month + offset, 1);
    const days = getDaysInMonth(tempDate.getFullYear(), tempDate.getMonth());

    for (let d = 1; d <= days; d += stepDays) {
      const cellDate = new Date(tempDate.getFullYear(), tempDate.getMonth(), d);
      const label = `${cellDate.getMonth() + 1}/${cellDate.getDate()}`;
      headerRow.innerHTML += `<th>${label}</th>`;
      dateList.push(cellDate);
    }
  }

  // ヘッダー行作成
  headerRow.innerHTML = `<th>船員名</th>`;
  dateList.forEach(date => {
    headerRow.innerHTML += `<th>${date.getMonth() + 1}/${date.getDate()}</th>`;
  });
  tableHead.appendChild(headerRow);

  const res = await fetch("/assignments");
  const data = await res.json();
  data.sort((a, b) => a.ship_id - b.ship_id);

  // crew_idでグルーピング
  const groupedData = {};
  data.forEach(item => {
    if (!groupedData[item.crew_id]) {
      groupedData[item.crew_id] = {
        crew_name: item.crew_name,
        assignments: []
      };
    }
    groupedData[item.crew_id].assignments.push(item);
  });

  Object.values(groupedData).forEach(group => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${group.crew_name}</td>`;

    dateList.forEach(cellDate => {
      const cellStr = toDateStringYMD(cellDate);
      const cell = document.createElement("td");
      cell.className = "assignment-cell";

      group.assignments.forEach(item => {
        const onboard = parseUTCDateStringAsLocalDate(item.onboard_date);
        const offboard = item.offboard_date ? parseUTCDateStringAsLocalDate(item.offboard_date) : null;
        const onboardStr = toDateStringYMD(onboard);
        const offboardStr = item.offboard_date ? toDateStringYMD(offboard) : null;

        if (onboard <= cellDate && (!offboard || cellDate <= offboard)) {
          cell.style.backgroundColor = shipColors[item.ship_name] || "#dddddd";

          const isOnboard = cellStr === onboardStr;
          const isOffboard = cellStr === offboardStr;
          const isLastDay = !item.offboard_date && cellStr === toDateStringYMD(dateList[dateList.length - 1]);

          if (isOnboard || isOffboard || isLastDay) {
            cell.draggable = true;
            cell.addEventListener("dragstart", () => {
              draggedAssignment = item;
              draggedType = isOnboard ? "onboard" : "offboard";
            });
          }

          cell.addEventListener("dragover", e => e.preventDefault());
          cell.addEventListener("drop", () => handleDrop(cellDate));
        }
      });

      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });
}

async function handleDrop(dropDate) {
  if (!draggedAssignment || !draggedType) return;

  const onboard = new Date(draggedAssignment.onboard_date);
  const offboard = draggedAssignment.offboard_date ? new Date(draggedAssignment.offboard_date) : null;
  let newOnboard = onboard;
  let newOffboard = offboard;

  if (draggedType === "onboard") {
    newOnboard = dropDate;
  } else if (draggedType === "offboard") {
    newOffboard = dropDate;
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

  await fetch("/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postData)
  });

  await fetch(`/assignments/${draggedAssignment.id}`, {
    method: "DELETE"
  });

  loadAssignments(currentYear, currentMonth);
}

document.addEventListener("DOMContentLoaded", async () => {
  const yearSel = document.getElementById("yearSelect");
  const monthSel = document.getElementById("monthSelect");
  const viewSpanSel = document.getElementById("viewSpanSelect");
  const reloadBtn = document.getElementById("reloadBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();

  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    yearSel.appendChild(opt);
  }

  for (let m = 0; m < 12; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = `${m + 1}月`;
    if (m === currentMonth) opt.selected = true;
    monthSel.appendChild(opt);
  }

  viewSpanSel.addEventListener("change", () => {
    viewSpan = parseInt(viewSpanSel.value);
    loadAssignments(currentYear, currentMonth);
  });

  reloadBtn.addEventListener("click", () => {
    currentYear = parseInt(yearSel.value);
    currentMonth = parseInt(monthSel.value);
    loadAssignments(currentYear, currentMonth);
  });

  prevBtn.addEventListener("click", () => {
    currentMonth -= viewSpan;
    if (currentMonth < 0) {
      currentYear -= 1;
      currentMonth += 12;
    }
    loadAssignments(currentYear, currentMonth);
  });

  nextBtn.addEventListener("click", () => {
    currentMonth += viewSpan;
    if (currentMonth > 11) {
      currentYear += 1;
      currentMonth -= 12;
    }
    loadAssignments(currentYear, currentMonth);
  });

  await loadShipColors();
  await loadAssignments(currentYear, currentMonth);
});
