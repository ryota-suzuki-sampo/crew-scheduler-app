// static/app.js

// 月の日数を取得
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

let dragStartCell = null;
let dragEndCell = null;

// 表の描画処理
async function loadAssignments() {
  const tableBody = document.getElementById("assignment-table-body");
  const year = parseInt(document.getElementById("yearSelect").value);
  const month = parseInt(document.getElementById("monthSelect").value) - 1;
  const daysInMonth = getDaysInMonth(year, month);

  // データ取得
  const res = await fetch("/assignments");
  const data = await res.json();

  // 行ごとに船員名・船名と配乗状況表示
  tableBody.innerHTML = "";
  for (const item of data) {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = item.crew_name;
    row.appendChild(nameCell);

    const shipCell = document.createElement("td");
    shipCell.textContent = item.ship_name;
    row.appendChild(shipCell);

    const onboard = new Date(item.onboard_date);
    const offboard = item.offboard_date ? new Date(item.offboard_date) : null;
    const color = item.color_code || "#dddddd";

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement("td");
      const cellDate = new Date(year, month, d);
      cell.dataset.crewName = item.crew_name;
      cell.dataset.date = cellDate.toISOString().slice(0, 10);
      cell.classList.add("assignment-cell");

      // 配乗期間のセルを塗る
      if (onboard <= cellDate && (!offboard || cellDate <= offboard)) {
        cell.style.backgroundColor = color;
      }

      // ドラッグ開始・終了検出
      cell.addEventListener("mousedown", () => {
        dragStartCell = cell;
        dragEndCell = null;
      });
      cell.addEventListener("mouseover", () => {
        if (dragStartCell) {
          dragEndCell = cell;
        }
      });
      cell.addEventListener("mouseup", () => {
        if (dragStartCell && dragEndCell) {
          handleDragSelection(dragStartCell, dragEndCell);
          dragStartCell = null;
          dragEndCell = null;
        }
      });

      row.appendChild(cell);
    }

    tableBody.appendChild(row);
  }
}

// ドラッグ範囲処理
function handleDragSelection(startCell, endCell) {
  const startDate = new Date(startCell.dataset.date);
  const endDate = new Date(endCell.dataset.date);

  const onboard = startDate < endDate ? startDate : endDate;
  const offboard = startDate < endDate ? endDate : startDate;
  const crewName = startCell.dataset.crewName;

  alert(`${crewName} の ${onboard.toISOString().slice(0, 10)} 〜 ${offboard.toISOString().slice(0, 10)} が選択されました。`);

  // ※このあと「船選択」→「POST送信」へ進みます
}

// 初期化とセレクトボックスイベント
document.addEventListener("DOMContentLoaded", () => {
  const yearSel = document.getElementById("yearSelect");
  const monthSel = document.getElementById("monthSelect");

  const now = new Date();
  yearSel.value = now.getFullYear();
  monthSel.value = now.getMonth() + 1;

  yearSel.addEventListener("change", loadAssignments);
  monthSel.addEventListener("change", loadAssignments);

  loadAssignments();
});

document.getElementById("submitAssignment").addEventListener("click", () => {
  const shipId = document.getElementById("shipSelect").value;
  const status = document.getElementById("statusSelect").value;
  const crewName = window.selectedCrew;

  // crew_name → crew_id に変換（APIで取得）
  fetch("/crew_members")
    .then(res => res.json())
    .then(crewList => {
      const crew = crewList.find(c => `${c.last_name} ${c.first_name}` === crewName);
      if (!crew) return alert("船員が見つかりません");

      // 登録リクエスト送信
      return fetch("/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crew_id: crew.id,
          ship_id: parseInt(shipId),
          onboard_date: window.selectedOnboard,
          offboard_date: window.selectedOffboard,
          status: status
        })
      });
    })
    .then(() => {
      alert("登録完了");
      window.location.reload();
    })
    .catch(err => {
      console.error(err);
      alert("登録に失敗しました");
    });
});

