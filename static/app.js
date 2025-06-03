// static/app.js

// 月の日数を取得
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// 船名→色コードのマップ（後でAPIから取得）
const shipColorMap = new Map();

// 色情報を読み込み
async function loadShipColors() {
  const res = await fetch("/ships");
  const ships = await res.json();
  ships.forEach(ship => {
    shipColorMap.set(ship.name, ship.color_code || "#dddddd");
  });
}

// 表の描画
async function loadAssignments() {
  const table = document.getElementById("assignment-table");
  const year = new Date().getFullYear();
  const month = new Date().getMonth(); // 0-indexed
  const daysInMonth = getDaysInMonth(year, month);

  // テーブルヘッダー
  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  headerRow.insertCell().textContent = "船員名";
  headerRow.insertCell().textContent = "船名";
  for (let d = 1; d <= daysInMonth; d++) {
    headerRow.insertCell().textContent = d;
  }

  // データ取得
  const res = await fetch("/assignments");
  const data = await res.json();

  // テーブル本体
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

// 初期化
window.addEventListener("DOMContentLoaded", async () => {
  await loadShipColors();
  await loadAssignments();
});
