<script>
// ============================================================
// js4.html — Reports | Profile | Users | Settings
// ============================================================

// ===== REPORTS =====
var _reportCharts = {};

function renderReports() {
  var now = new Date();
  var html = '<div class="fade-in space-y-4">';
  html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';

  // Card 1: รายงานรับเข้า
  html += '<div class="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">';
  html += '<div class="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-inbox-in text-blue-600 text-xl"></i></div>';
  html += '<div><p class="font-semibold text-gray-800">รายงานรับวัสดุเข้า</p><p class="text-xs text-gray-400 mt-0.5">ประวัติการรับวัสดุทั้งหมด</p></div>';
  html += '<button onclick="loadReceiveReport()" class="btn-primary btn-sm mt-auto"><i class="fi fi-rr-eye mr-1"></i>ดูรายงาน</button></div>';

  // Card 2: รายงานเบิกออก
  html += '<div class="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">';
  html += '<div class="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-inbox-out text-purple-600 text-xl"></i></div>';
  html += '<div><p class="font-semibold text-gray-800">รายงานเบิกวัสดุออก</p><p class="text-xs text-gray-400 mt-0.5">ประวัติการเบิกและอนุมัติ</p></div>';
  html += '<button onclick="loadWithdrawReport()" class="btn-primary btn-sm mt-auto"><i class="fi fi-rr-eye mr-1"></i>ดูรายงาน</button></div>';

  // Card 3: สรุปรายเดือน
  html += '<div class="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">';
  html += '<div class="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-calendar text-green-600 text-xl"></i></div>';
  html += '<div><p class="font-semibold text-gray-800">สรุปรายเดือน</p><p class="text-xs text-gray-400 mt-0.5">ยอดรับ-เบิกตาราง Matrix</p></div>';
  html += '<div class="flex gap-2 mt-auto">';
  html += '<select id="rptYear" class="form-input flex-1 text-xs">';
  for (var y = now.getFullYear(); y >= now.getFullYear()-2; y--) {
    html += '<option value="' + y + '">' + (y+543) + '</option>';
  }
  html += '</select>';
  html += '<select id="rptMonth" class="form-input flex-1 text-xs">';
  var mNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  for (var m = 1; m <= 12; m++) {
    html += '<option value="' + m + '" ' + (m===now.getMonth()+1?'selected':'') + '>' + mNames[m-1] + '</option>';
  }
  html += '</select></div>';
  html += '<button onclick="loadMonthlyReport()" class="btn-success btn-sm"><i class="fi fi-rr-chart-histogram mr-1"></i>ดูรายงาน</button></div>';
  html += '</div>';

  // วัสดุใกล้หมด Banner
  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-triangle-warning text-amber-500"></i> รายการวัสดุที่ต้องเติมสต็อก</h3>';
  html += '<button onclick="exportLowStock()" class="btn-warning btn-sm flex items-center gap-1"><i class="fi fi-rr-file-spreadsheet"></i> Export</button></div>';
  html += '<div class="card-body" id="lowStockReport"><div class="flex justify-center py-4"><div class="w-6 h-6 border-2 border-navy-600 border-t-transparent rounded-full animate-spin"></div></div></div></div>';

  // กราฟรวม
  html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">';
  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-chart-histogram text-navy-600"></i> ยอดเบิกรายเดือน (6 เดือนล่าสุด)</h3></div>';
  html += '<div class="card-body"><div style="position:relative;height:220px"><canvas id="rptChartMonthly"></canvas></div></div></div>';
  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-star text-amber-500"></i> Top 10 วัสดุที่เบิกมากสุด</h3></div>';
  html += '<div class="card-body" id="rptTopItems"><div class="flex justify-center py-4"><div class="w-6 h-6 border-2 border-navy-600 border-t-transparent rounded-full animate-spin"></div></div></div></div>';
  html += '</div>';

  html += '<div id="reportDataSection"></div></div>';
  document.getElementById('mainContent').innerHTML = html;

  // โหลดกราฟและ low stock พร้อมกัน
  Promise.all([
    callAPI('getDashboardStats', AUTH.token),
    callAPI('getItems', AUTH.token)
  ]).then(function(results) {
    var stats = results[0];
    var items = results[1].data || [];
    var lowItems = items.filter(function(i){ return i.current_stock <= (i.min_stock||5); });

    // Low stock table
    var lsHtml = '';
    if (lowItems.length === 0) {
      lsHtml = '<p class="text-center text-sm text-gray-400 py-4">ไม่มีรายการวัสดุที่ต้องเติม</p>';
    } else {
      lsHtml = '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
      lsHtml += '<tr><th class="px-4 py-2 text-left">รหัส</th><th class="px-4 py-2 text-left">ชื่อวัสดุ</th><th class="px-4 py-2 text-center">คงเหลือ</th><th class="px-4 py-2 text-center">ขั้นต่ำ</th><th class="px-4 py-2 text-center">สถานะ</th></tr>';
      lsHtml += '</thead><tbody class="divide-y divide-gray-100">';
      lowItems.forEach(function(i) {
        var sc = getStockClass(i.current_stock, i.min_stock);
        lsHtml += '<tr><td class="px-4 py-2 font-mono text-xs text-navy-700">' + escHtml(i.item_code) + '</td>';
        lsHtml += '<td class="px-4 py-2 font-medium text-gray-700">' + escHtml(i.name) + '</td>';
        lsHtml += '<td class="px-4 py-2 text-center font-bold">' + i.current_stock + ' ' + escHtml(i.unit) + '</td>';
        lsHtml += '<td class="px-4 py-2 text-center text-gray-400">' + i.min_stock + '</td>';
        lsHtml += '<td class="px-4 py-2 text-center"><span class="px-2 py-0.5 rounded-full text-xs ' + sc + '">' + getStockLabel(i.current_stock, i.min_stock) + '</span></td></tr>';
      });
      lsHtml += '</tbody></table></div>';
    }
    document.getElementById('lowStockReport').innerHTML = lsHtml;

    // Top items
    if (stats.top_items && stats.top_items.length > 0) {
      var tiHtml = '<div class="space-y-2">';
      var maxQ = stats.top_items[0].qty || 1;
      stats.top_items.forEach(function(item, idx) {
        var pct = Math.round(item.qty / maxQ * 100);
        tiHtml += '<div class="flex items-center gap-2">';
        tiHtml += '<span class="text-xs font-bold text-gray-400 w-5 text-right">' + (idx+1) + '</span>';
        tiHtml += '<div class="flex-1"><p class="text-xs font-medium text-gray-700 mb-0.5 truncate">' + escHtml(item.name) + '</p>';
        tiHtml += '<div class="progress-bar"><div class="progress-fill bg-navy-600" style="width:' + pct + '%"></div></div></div>';
        tiHtml += '<span class="text-xs font-bold text-navy-700 w-8 text-right">' + item.qty + '</span></div>';
      });
      tiHtml += '</div>';
      document.getElementById('rptTopItems').innerHTML = tiHtml;
    } else {
      document.getElementById('rptTopItems').innerHTML = '<p class="text-center text-sm text-gray-400 py-4">ยังไม่มีข้อมูลการเบิก</p>';
    }

    // Monthly Chart
    if (stats.monthly && document.getElementById('rptChartMonthly')) {
      if (_reportCharts.monthly) _reportCharts.monthly.destroy();
      _reportCharts.monthly = new Chart(document.getElementById('rptChartMonthly'), {
        type:'bar',
        data:{
          labels: stats.monthly.map(function(m){ return m.label; }),
          datasets:[
            { label:'รับเข้า', data:stats.monthly.map(function(m){ return m.receive; }), backgroundColor:'#3b82f6', borderRadius:5, barPercentage:0.6 },
            { label:'เบิกออก', data:stats.monthly.map(function(m){ return m.withdraw; }), backgroundColor:'#8b5cf6', borderRadius:5, barPercentage:0.6 }
          ]
        },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'top',labels:{font:{family:'Sarabun',size:11},boxWidth:12}}}, scales:{y:{ticks:{font:{family:'Sarabun',size:11}},grid:{color:'#f3f4f6'}},x:{ticks:{font:{family:'Sarabun',size:11}},grid:{display:false}}} }
      });
    }
  }).catch(function(err) { console.error(err); });
}

// รายงานรับเข้า
function loadReceiveReport() {
  showLoading('โหลดรายงาน...');
  callAPI('getReceives', AUTH.token, {}).then(function(res) {
    hideLoading();
    var data = res.data || [];
    var html = '<div class="card mt-4"><div class="card-header">';
    html += '<h3 class="font-semibold text-gray-700 text-sm">รายงานรับวัสดุเข้าคลัง (' + data.length + ' รายการ)</h3>';
    html += '<button onclick="exportReport(\'receives\')" class="btn-success btn-sm flex items-center gap-1"><i class="fi fi-rr-file-spreadsheet"></i> Export Excel</button></div>';
    html += '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
    html += '<tr><th class="px-4 py-2 text-left">เลขที่</th><th class="px-4 py-2 text-left">วันที่</th><th class="px-4 py-2 text-left">รายการ</th><th class="px-4 py-2 text-center">จำนวน</th><th class="px-4 py-2 text-left">ผู้รับ</th><th class="px-4 py-2 text-left">หมายเหตุ</th></tr>';
    html += '</thead><tbody class="divide-y">';
    if (!data.length) html += '<tr><td colspan="6" class="text-center py-8 text-gray-400">ไม่มีรายการ</td></tr>';
    data.slice(0,50).forEach(function(r) {
      html += '<tr><td class="px-4 py-2 font-mono text-xs text-navy-700">' + escHtml(r.receive_no) + '</td>';
      html += '<td class="px-4 py-2 text-xs text-gray-500">' + formatDate(r.date) + '</td>';
      html += '<td class="px-4 py-2 text-gray-700">' + escHtml(r.item_name||'-') + '</td>';
      html += '<td class="px-4 py-2 text-center font-bold text-blue-700">+' + r.quantity + ' ' + escHtml(r.unit||'') + '</td>';
      html += '<td class="px-4 py-2 text-xs text-gray-500">' + escHtml(r.received_by_name||'-') + '</td>';
      html += '<td class="px-4 py-2 text-xs text-gray-400">' + escHtml(r.note||'-') + '</td></tr>';
    });
    if (data.length > 50) html += '<tr><td colspan="6" class="text-center py-3 text-xs text-gray-400">แสดง 50 รายการแรก Export Excel เพื่อดูทั้งหมด</td></tr>';
    html += '</tbody></table></div></div>';
    document.getElementById('reportDataSection').innerHTML = html;
    document.getElementById('reportDataSection').scrollIntoView({ behavior:'smooth' });
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

// รายงานเบิกออก
function loadWithdrawReport() {
  showLoading('โหลดรายงาน...');
  callAPI('getWithdrawals', AUTH.token, { status:'all' }).then(function(res) {
    hideLoading();
    var data = res.data || [];
    var html = '<div class="card mt-4"><div class="card-header">';
    html += '<h3 class="font-semibold text-gray-700 text-sm">รายงานเบิกวัสดุออก (' + data.length + ' รายการ)</h3>';
    html += '<button onclick="exportReport(\'withdrawals\')" class="btn-success btn-sm flex items-center gap-1"><i class="fi fi-rr-file-spreadsheet"></i> Export Excel</button></div>';
    html += '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
    html += '<tr><th class="px-4 py-2 text-left">เลขที่</th><th class="px-4 py-2 text-left">วันที่</th><th class="px-4 py-2 text-left">รายการ</th><th class="px-4 py-2 text-center">ขอ/อนุมัติ</th><th class="px-4 py-2 text-left">ผู้เบิก</th><th class="px-4 py-2 text-left">วัตถุประสงค์</th><th class="px-4 py-2 text-center">สถานะ</th></tr>';
    html += '</thead><tbody class="divide-y">';
    if (!data.length) html += '<tr><td colspan="7" class="text-center py-8 text-gray-400">ไม่มีรายการ</td></tr>';
    data.slice(0,50).forEach(function(w) {
      var bc = w.status==='approved'?'badge-approved':w.status==='rejected'?'badge-rejected':'badge-pending';
      var sl = {pending:'รออนุมัติ',approved:'อนุมัติ',rejected:'ปฏิเสธ'}[w.status]||w.status;
      html += '<tr><td class="px-4 py-2 font-mono text-xs text-navy-700">' + escHtml(w.withdraw_no) + '</td>';
      html += '<td class="px-4 py-2 text-xs text-gray-500">' + formatDate(w.requested_at) + '</td>';
      html += '<td class="px-4 py-2 text-gray-700">' + escHtml(w.item_name||'-') + '</td>';
      html += '<td class="px-4 py-2 text-center text-xs">' + w.quantity_requested + (w.quantity_approved?'/' + w.quantity_approved:'') + ' ' + escHtml(w.unit||'') + '</td>';
      html += '<td class="px-4 py-2 text-xs text-gray-500">' + escHtml(w.requested_by_name||'-') + '</td>';
      html += '<td class="px-4 py-2 text-xs text-gray-400">' + escHtml(w.purpose||'-') + '</td>';
      html += '<td class="px-4 py-2 text-center"><span class="px-2 py-0.5 rounded-full text-xs ' + bc + '">' + sl + '</span></td></tr>';
    });
    if (data.length > 50) html += '<tr><td colspan="7" class="text-center py-3 text-xs text-gray-400">แสดง 50 รายการแรก Export Excel เพื่อดูทั้งหมด</td></tr>';
    html += '</tbody></table></div></div>';
    document.getElementById('reportDataSection').innerHTML = html;
    document.getElementById('reportDataSection').scrollIntoView({ behavior:'smooth' });
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

// รายงานสรุปรายเดือน (Matrix ตาราง)
function loadMonthlyReport() {
  var year  = parseInt((document.getElementById('rptYear')||{}).value||new Date().getFullYear());
  var month = parseInt((document.getElementById('rptMonth')||{}).value||new Date().getMonth()+1);
  showLoading('โหลดรายงานรายเดือน...');
  callAPI('getMonthlyReport', AUTH.token, year, month).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    var data = res.data || [];
    var mNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    var daysInMonth = new Date(year, month, 0).getDate();

    var html = '<div class="card mt-4"><div class="card-header">';
    html += '<h3 class="font-semibold text-gray-700 text-sm">สรุปการเบิกวัสดุ ' + mNames[month-1] + ' ' + (year+543) + '</h3>';
    html += '<button onclick="exportMonthlyExcel(' + year + ',' + month + ')" class="btn-success btn-sm flex items-center gap-1"><i class="fi fi-rr-file-spreadsheet"></i> Export Excel</button></div>';
    html += '<div class="overflow-x-auto"><table class="w-full text-xs border-collapse">';
    html += '<thead class="bg-navy-700 text-white sticky top-0">';
    html += '<tr><th class="px-2 py-2 text-left min-w-[160px] border border-navy-600">ชื่อวัสดุ</th>';
    html += '<th class="px-2 py-2 text-center border border-navy-600 w-12">หน่วย</th>';
    html += '<th class="px-2 py-2 text-center border border-navy-600 w-14">รับเข้า</th>';
    for (var d = 1; d <= daysInMonth; d++) {
      html += '<th class="px-1 py-2 text-center border border-navy-600 w-8">' + d + '</th>';
    }
    html += '<th class="px-2 py-2 text-center border border-navy-600 w-14">รวมเบิก</th>';
    html += '<th class="px-2 py-2 text-center border border-navy-600 w-14">คงเหลือ</th></tr></thead>';
    html += '<tbody>';
    if (!data.length) {
      html += '<tr><td colspan="' + (daysInMonth + 5) + '" class="text-center py-6 text-gray-400">ไม่มีข้อมูล</td></tr>';
    }
    data.forEach(function(row, idx) {
      html += '<tr class="' + (idx%2===0?'bg-white':'bg-gray-50') + ' hover:bg-blue-50">';
      html += '<td class="px-2 py-1.5 border border-gray-200 font-medium text-gray-700">' + escHtml(row.name) + (row.size ? ' <span class="text-gray-400">(' + escHtml(row.size) + ')</span>' : '') + '</td>';
      html += '<td class="px-2 py-1.5 border border-gray-200 text-center text-gray-500">' + escHtml(row.unit) + '</td>';
      html += '<td class="px-2 py-1.5 border border-gray-200 text-center font-bold text-blue-700">' + (row.received||0) + '</td>';
      for (var d = 1; d <= daysInMonth; d++) {
        var dayVal = row.daily[d] || 0;
        html += '<td class="px-1 py-1.5 border border-gray-200 text-center ' + (dayVal > 0 ? 'bg-purple-50 font-bold text-purple-700' : 'text-gray-300') + '">' + (dayVal > 0 ? dayVal : '') + '</td>';
      }
      html += '<td class="px-2 py-1.5 border border-gray-200 text-center font-bold text-purple-700">' + (row.total_withdraw||0) + '</td>';
      html += '<td class="px-2 py-1.5 border border-gray-200 text-center font-bold ' + (row.current_stock <= row.min_stock ? 'text-red-600' : 'text-green-700') + '">' + row.current_stock + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    html += '<p class="text-xs text-gray-400 px-4 py-2">* ค่าในตารางแสดงจำนวนที่เบิกออกแต่ละวัน</p></div>';
    document.getElementById('reportDataSection').innerHTML = html;
    document.getElementById('reportDataSection').scrollIntoView({ behavior:'smooth' });
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function exportReport(type) {
  showLoading('กำลัง Export...');
  callAPI('generateExportUrl', AUTH.token, type, { status:'all' }).then(function(res) {
    hideLoading();
    if (res.success) { window.open(res.url, '_blank'); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('Export ไม่สำเร็จ'); });
}

function exportMonthlyExcel(year, month) {
  showLoading('กำลัง Export...');
  callAPI('generateExportUrl', AUTH.token, 'monthly', { year:year, month:month }).then(function(res) {
    hideLoading();
    if (res.success) { window.open(res.url, '_blank'); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('Export ไม่สำเร็จ'); });
}

function exportLowStock() {
  showLoading('กำลัง Export...');
  callAPI('generateExportUrl', AUTH.token, 'low_stock', {}).then(function(res) {
    hideLoading();
    if (res.success) { window.open(res.url, '_blank'); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('Export ไม่สำเร็จ'); });
}

// ===== PROFILE =====
function renderProfile() {
  showLoading('โหลดโปรไฟล์...');
  callAPI('getUsers', AUTH.user.role === 'admin' ? AUTH.token : AUTH.token).then(function(res) {
    hideLoading();
    var users = res.data || [];
    var user  = users.find(function(u){ return u.id === AUTH.user.id; }) || AUTH.user;
    buildProfilePage(user);
  }).catch(function() {
    hideLoading();
    buildProfilePage(AUTH.user);
  });
}

function buildProfilePage(user) {
  var avatarUrl = user.avatar ? 'https://lh5.googleusercontent.com/d/' + user.avatar : '';
  var html = '<div class="fade-in w-full space-y-4">';

  // Profile Card
  html += '<div class="card p-6">';
  html += '<div class="flex items-center gap-5 mb-6">';
  html += '<div class="relative">';
  html += '<div class="w-20 h-20 rounded-2xl bg-navy-100 flex items-center justify-center overflow-hidden shadow">';
  if (avatarUrl) html += '<img src="' + escHtml(avatarUrl) + '" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML=\'<i class=\\\"fi fi-rr-user text-navy-600 text-3xl\\\"></i>\'">';
  else html += '<i class="fi fi-rr-user text-navy-600 text-3xl"></i>';
  html += '</div>';
  html += '<label class="absolute -bottom-1 -right-1 w-6 h-6 bg-navy-700 rounded-lg flex items-center justify-center cursor-pointer hover:bg-navy-800 transition">';
  html += '<i class="fi fi-rr-camera text-white text-xs"></i>';
  html += '<input type="file" accept="image/*" class="hidden" onchange="uploadAvatar(event)"></label></div>';
  html += '<div>';
  html += '<h2 class="text-xl font-bold text-gray-800">' + escHtml(user.name||user.username) + '</h2>';
  html += '<p class="text-sm text-gray-500">@' + escHtml(user.username||'-') + '</p>';
  html += '<span class="mt-1 inline-block px-3 py-0.5 bg-navy-100 text-navy-700 rounded-full text-xs font-semibold">' + (ROLE_LABELS[user.role]||user.role) + '</span>';
  html += '</div></div>';
  html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
  html += '<div><label class="form-label">ชื่อ-นามสกุล</label><input type="text" id="profName" value="' + escHtml(user.name||'') + '" class="form-input"></div>';
  html += '<div><label class="form-label">อีเมล</label><input type="email" id="profEmail" value="' + escHtml(user.email||'') + '" class="form-input"></div>';
  html += '<div><label class="form-label">เบอร์โทรศัพท์</label><input type="text" id="profPhone" value="' + escHtml(user.phone||'') + '" class="form-input"></div>';
  html += '<div><label class="form-label">Telegram Chat ID <span class="text-gray-400 text-xs">(สำหรับรับแจ้งเตือนส่วนตัว)</span></label>';
  html += '<input type="text" id="profTgId" value="' + escHtml(user.telegram_chat_id||'') + '" placeholder="เช่น 123456789" class="form-input"></div>';
  html += '</div>';
  html += '<div class="flex justify-end mt-4">';
  html += '<button onclick="saveProfile(\'' + user.id + '\')" class="btn-primary"><i class="fi fi-rr-disk mr-1"></i>บันทึกข้อมูล</button></div>';
  html += '</div>';

  // เปลี่ยนรหัสผ่าน
  html += '<div class="card p-6"><h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fi fi-rr-lock text-navy-600"></i> เปลี่ยนรหัสผ่าน</h3>';
  html += '<div class="space-y-3">';
  html += passFieldHTML('รหัสผ่านเดิม *', 'profOldPass');
  html += passFieldHTML('รหัสผ่านใหม่ *', 'profNewPass');
  html += passFieldHTML('ยืนยันรหัสผ่านใหม่ *', 'profConfPass');
  html += '</div>';
  html += '<div class="flex justify-end mt-4"><button onclick="doChangePassword()" class="btn-primary"><i class="fi fi-rr-lock mr-1"></i>เปลี่ยนรหัสผ่าน</button></div></div>';

  // สถานะบัญชี
  html += '<div class="card p-4 flex items-center gap-4">';
  html += '<div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-shield-check text-green-600 text-lg"></i></div>';
  html += '<div><p class="font-semibold text-gray-700 text-sm">สถานะบัญชี</p>';
  html += '<p class="text-xs text-gray-400">บทบาท: ' + (ROLE_LABELS[user.role]||user.role) + ' | เข้าสู่ระบบล่าสุด: ' + formatDateTime(user.last_login||'-') + '</p></div></div>';

  html += '</div>';
  document.getElementById('mainContent').innerHTML = html;
}

function passFieldHTML(label, id) {
  return '<div><label class="form-label">' + escHtml(label) + '</label>'
    + '<div class="relative"><input type="password" id="' + id + '" class="form-input pr-10" placeholder="••••••••">'
    + '<button type="button" onclick="togglePass(\'' + id + '\',this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">'
    + '<i class="fi fi-rr-eye text-sm"></i></button></div></div>';
}

function saveProfile(userId) {
  var data = {
    name:  (document.getElementById('profName')||{}).value||'',
    email: (document.getElementById('profEmail')||{}).value||'',
    phone: (document.getElementById('profPhone')||{}).value||'',
    telegram_chat_id: (document.getElementById('profTgId')||{}).value||''
  };
  if (!data.name.trim()) { showError('กรุณากรอกชื่อ'); return; }
  showLoading('กำลังบันทึก...');
  callAPI('updateUser', AUTH.token, userId, data).then(function(res) {
    hideLoading();
    if (res.success) {
      AUTH.user.name = data.name;
      localStorage.setItem('sup_user', JSON.stringify(AUTH.user));
      document.getElementById('sidebarName').textContent = data.name;
      showSuccess(res.message);
    } else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

function doChangePassword() {
  var oldPass  = (document.getElementById('profOldPass')||{}).value||'';
  var newPass  = (document.getElementById('profNewPass')||{}).value||'';
  var confPass = (document.getElementById('profConfPass')||{}).value||'';
  if (!oldPass || !newPass || !confPass) { showError('กรุณากรอกข้อมูลให้ครบ'); return; }
  if (newPass !== confPass) { showError('รหัสผ่านใหม่ไม่ตรงกัน'); return; }
  if (newPass.length < 6) { showError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
  showLoading('กำลังเปลี่ยนรหัสผ่าน...');
  callAPI('changePassword', AUTH.token, oldPass, newPass).then(function(res) {
    hideLoading();
    if (res.success) {
      showSuccess(res.message);
      ['profOldPass','profNewPass','profConfPass'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
    } else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

function uploadAvatar(event) {
  var file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showError('ไฟล์ต้องไม่เกิน 2 MB'); return; }
  showLoading('กำลังอัปโหลดรูป...');
  var reader = new FileReader();
  reader.onload = function(e) {
    var base64 = e.target.result.split(',')[1];
    callAPI('uploadFile', AUTH.token, base64, file.type, file.name).then(function(res) {
      hideLoading();
      if (res.success) {
        callAPI('updateUser', AUTH.token, AUTH.user.id, { avatar: res.file_id }).then(function() {
          showSuccess('อัปโหลดรูปโปรไฟล์สำเร็จ');
          renderProfile();
        });
      } else showError(res.message);
    }).catch(function() { hideLoading(); showError('อัปโหลดไม่สำเร็จ'); });
  };
  reader.readAsDataURL(file);
}

// ===== USERS MANAGEMENT =====
var _usersData = [];
var _usersPage = 1;

function renderUsers() {
  if (AUTH.user.role !== 'admin') { loadPage('dashboard'); return; }
  showLoading('โหลดรายชื่อผู้ใช้...');
  callAPI('getUsers', AUTH.token).then(function(res) {
    hideLoading();
    _usersData = res.data || [];
    _usersPage = 1;
    buildUsersPage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildUsersPage() {
  var paged = paginate(_usersData, _usersPage);
  var html = '<div class="fade-in space-y-4">';
  html += '<div class="flex items-center justify-between">';
  html += '<h3 class="font-semibold text-gray-700 flex items-center gap-2"><i class="fi fi-rr-users text-navy-600"></i> ผู้ใช้งานทั้งหมด (' + _usersData.length + ')</h3>';
  html += '<button onclick="openAddUserModal()" class="btn-primary flex items-center gap-2"><i class="fi fi-rr-user-add"></i> เพิ่มผู้ใช้</button></div>';

  // Desktop table
  html += '<div class="card overflow-hidden"><div class="hidden md:block overflow-x-auto">';
  html += '<table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
  html += '<tr><th class="px-4 py-3 text-left">ชื่อ-นามสกุล</th><th class="px-4 py-3 text-left">Username</th>';
  html += '<th class="px-4 py-3 text-left">บทบาท</th><th class="px-4 py-3 text-left">อีเมล</th>';
  html += '<th class="px-4 py-3 text-left">เข้าสู่ระบบล่าสุด</th><th class="px-4 py-3 text-center">สถานะ</th>';
  html += '<th class="px-4 py-3 text-center">จัดการ</th></tr></thead><tbody class="divide-y divide-gray-100">';
  if (!paged.length) html += '<tr><td colspan="7" class="text-center py-10 text-gray-400">ไม่มีผู้ใช้งาน</td></tr>';
  paged.forEach(function(u) {
    var roleColor = u.role==='admin'?'bg-navy-100 text-navy-700':u.role==='staff'?'bg-blue-100 text-blue-700':'bg-green-100 text-green-700';
    html += '<tr>';
    html += '<td class="px-4 py-2.5"><div class="flex items-center gap-2">';
    html += '<div class="w-8 h-8 rounded-xl bg-navy-100 flex items-center justify-center flex-shrink-0"><i class="fi fi-rr-user text-navy-600 text-sm"></i></div>';
    html += '<span class="font-medium text-gray-700">' + escHtml(u.name||'-') + '</span></div></td>';
    html += '<td class="px-4 py-2.5 font-mono text-xs text-gray-500">' + escHtml(u.username) + '</td>';
    html += '<td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded-full text-xs font-medium ' + roleColor + '">' + (ROLE_LABELS[u.role]||u.role) + '</span></td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-500">' + escHtml(u.email||'-') + '</td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-400">' + formatDateTime(u.last_login) + '</td>';
    html += '<td class="px-4 py-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-xs font-medium ' + (u.active!==false?'bg-green-100 text-green-700':'bg-red-100 text-red-700') + '">' + (u.active!==false?'ใช้งาน':'ระงับ') + '</span></td>';
    html += '<td class="px-4 py-2.5 text-center"><div class="flex gap-1 justify-center">';
    html += '<button onclick="openEditUserModal(\'' + u.id + '\')" title="แก้ไข" class="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center hover:bg-blue-200"><i class="fi fi-rr-edit text-xs"></i></button>';
    html += '<button onclick="doResetPassword(\'' + u.id + '\')" title="Reset Password" class="w-7 h-7 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center hover:bg-amber-200"><i class="fi fi-rr-lock text-xs"></i></button>';
    if (u.id !== AUTH.user.id) {
      html += '<button onclick="doToggleUser(\'' + u.id + '\',\'' + escHtml(u.name||u.username) + '\')" title="' + (u.active!==false?'ระงับ':'เปิด') + 'บัญชี" class="w-7 h-7 ' + (u.active!==false?'bg-red-100 text-red-700 hover:bg-red-200':'bg-green-100 text-green-700 hover:bg-green-200') + ' rounded-lg flex items-center justify-center"><i class="fi fi-rr-' + (u.active!==false?'ban':'check-circle') + ' text-xs"></i></button>';
    }
    html += '</div></td></tr>';
  });
  html += '</tbody></table></div>';

  // Mobile cards
  html += '<div class="md:hidden divide-y">';
  paged.forEach(function(u) {
    var roleColor = u.role==='admin'?'bg-navy-100 text-navy-700':u.role==='staff'?'bg-blue-100 text-blue-700':'bg-green-100 text-green-700';
    html += '<div class="p-4 flex items-center gap-3">';
    html += '<div class="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center flex-shrink-0"><i class="fi fi-rr-user text-navy-600"></i></div>';
    html += '<div class="flex-1 min-w-0"><p class="font-semibold text-gray-800 text-sm">' + escHtml(u.name||'-') + '</p>';
    html += '<p class="text-xs text-gray-400">@' + escHtml(u.username) + '</p>';
    html += '<div class="flex gap-1.5 mt-1"><span class="px-2 py-0.5 rounded-full text-xs ' + roleColor + '">' + (ROLE_LABELS[u.role]||u.role) + '</span>';
    html += '<span class="px-2 py-0.5 rounded-full text-xs ' + (u.active!==false?'bg-green-100 text-green-700':'bg-red-100 text-red-700') + '">' + (u.active!==false?'ใช้งาน':'ระงับ') + '</span></div></div>';
    html += '<div class="flex gap-1">';
    html += '<button onclick="openEditUserModal(\'' + u.id + '\')" class="w-8 h-8 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center"><i class="fi fi-rr-edit text-sm"></i></button>';
    html += '<button onclick="doResetPassword(\'' + u.id + '\')" class="w-8 h-8 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center"><i class="fi fi-rr-lock text-sm"></i></button>';
    html += '</div></div>';
  });
  html += '</div></div>';
  html += '<div id="usersPagination"></div></div>';
  document.getElementById('mainContent').innerHTML = html;
  renderPagination('usersPagination', _usersData.length, _usersPage, function(p){ _usersPage=p; buildUsersPage(); });
}

function userFormHTML(user) {
  user = user || {};
  var roleOpts = ['admin','staff','employee'].map(function(r){ return '<option value="' + r + '"' + (user.role===r?' selected':'') + '>' + (ROLE_LABELS[r]||r) + '</option>'; }).join('');
  return '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">'
    + fieldHTML('ชื่อ-นามสกุล *', 'uName', 'text', user.name||'', 'sm:col-span-2')
    + fieldHTML('Username *', 'uUsername', 'text', user.username||'')
    + (!user.id ? '<div><label class="form-label">Password *</label><div class="relative"><input type="password" id="uPassword" class="form-input pr-10" placeholder="รหัสผ่าน"><button type="button" onclick="togglePass(\'uPassword\',this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><i class="fi fi-rr-eye text-sm"></i></button></div></div>' : '')
    + fieldHTML('อีเมล', 'uEmail', 'email', user.email||'')
    + fieldHTML('เบอร์โทร', 'uPhone', 'text', user.phone||'')
    + '<div><label class="form-label">บทบาท *</label><select id="uRole" class="form-input">' + roleOpts + '</select></div>'
    + '</div>';
}

function openAddUserModal() {
  var body   = userFormHTML({});
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="submitAddUser()" class="btn-primary"><i class="fi fi-rr-user-add mr-1"></i>เพิ่มผู้ใช้</button>';
  openModal('เพิ่มผู้ใช้งานใหม่', body, footer);
}

function openEditUserModal(id) {
  var u = _usersData.find(function(x){ return x.id === id; });
  if (!u) return;
  var body   = userFormHTML(u);
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="submitEditUser(\'' + id + '\')" class="btn-primary"><i class="fi fi-rr-disk mr-1"></i>บันทึก</button>';
  openModal('แก้ไขผู้ใช้งาน: ' + u.name, body, footer);
}

function submitAddUser() {
  var data = { name:(document.getElementById('uName')||{}).value||'', username:(document.getElementById('uUsername')||{}).value||'', password:(document.getElementById('uPassword')||{}).value||'', email:(document.getElementById('uEmail')||{}).value||'', phone:(document.getElementById('uPhone')||{}).value||'', role:(document.getElementById('uRole')||{}).value||'employee' };
  if (!data.name.trim() || !data.username.trim() || !data.password) { showError('กรุณากรอกข้อมูลที่จำเป็น'); return; }
  showLoading('กำลังบันทึก...');
  callAPI('addUser', AUTH.token, data).then(function(res) {
    hideLoading(); closeModal();
    if (res.success) { showSuccess(res.message); renderUsers(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

function submitEditUser(id) {
  var data = { name:(document.getElementById('uName')||{}).value||'', email:(document.getElementById('uEmail')||{}).value||'', phone:(document.getElementById('uPhone')||{}).value||'', role:(document.getElementById('uRole')||{}).value||'employee', active:true };
  if (!data.name.trim()) { showError('กรุณากรอกชื่อ'); return; }
  showLoading('กำลังบันทึก...');
  callAPI('updateUser', AUTH.token, id, data).then(function(res) {
    hideLoading(); closeModal();
    if (res.success) { showSuccess(res.message); renderUsers(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

function doResetPassword(userId) {
  showConfirm('Reset รหัสผ่าน','ระบบจะส่งรหัสผ่านชั่วคราวไปยังอีเมลของผู้ใช้', function() {
    showLoading('กำลัง Reset...');
    callAPI('resetUserPassword', AUTH.token, userId).then(function(res) {
      hideLoading();
      if (res.success) showSuccess(res.message);
      else showError(res.message);
    }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
  }, 'Reset Password');
}

function doToggleUser(userId, name) {
  var user = _usersData.find(function(u){ return u.id===userId; });
  var action = user && user.active!==false ? 'ระงับ' : 'เปิด';
  showConfirm(action + 'บัญชีผู้ใช้', action + 'บัญชีของ "' + name + '" ใช่หรือไม่?', function() {
    showLoading('กำลังดำเนินการ...');
    callAPI('toggleUserActive', AUTH.token, userId).then(function(res) {
      hideLoading();
      if (res.success) { showSuccess(res.message); renderUsers(); }
      else showError(res.message);
    }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
  }, action + 'บัญชี');
}

// ===== SETTINGS =====
function renderSettings() {
  if (AUTH.user.role !== 'admin') { loadPage('dashboard'); return; }
  showLoading('โหลดการตั้งค่า...');
  getConfig(AUTH.token).then(function(res) {
    hideLoading();
    var cfg = (res && res.success ? res.data : null) || {};
    buildSettingsPage(cfg);
  }).catch(function() { hideLoading(); buildSettingsPage({}); });
}

function buildSettingsPage(cfg) {
  var html = '<div class="fade-in w-full space-y-4">';

  // Section 1: ข้อมูลหน่วยงาน
  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 flex items-center gap-2"><i class="fi fi-rr-building text-navy-600"></i> ข้อมูลหน่วยงาน</h3></div>';
  html += '<div class="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">';
  html += fieldHTML('ชื่อระบบ', 'cfgAppName', 'text', cfg.app_name||'', 'sm:col-span-2');
  html += fieldHTML('ชื่อหน่วยงาน', 'cfgOrgName', 'text', cfg.organization_name||'', 'sm:col-span-2');
  html += fieldHTML('ที่อยู่', 'cfgOrgAddr', 'text', cfg.organization_address||'', 'sm:col-span-2');
  html += fieldHTML('เบอร์โทรศัพท์', 'cfgOrgPhone', 'text', cfg.organization_phone||'');
  html += fieldHTML('อีเมลหน่วยงาน', 'cfgOrgEmail', 'email', cfg.organization_email||'');
  html += '<div class="sm:col-span-2"><label class="form-label">โลโก้หน่วยงาน</label>';
  if (cfg.app_logo) {
    html += '<div class="flex items-center gap-4 mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200">'
      + '<img src="https://drive.google.com/thumbnail?id=' + escHtml(cfg.app_logo) + '&sz=w400-h400" class="h-20 rounded-xl object-contain border bg-white p-1" onerror="this.parentElement.innerHTML=\'<div class=\\\'w-20 h-20 bg-white rounded-xl flex items-center justify-center border\\\'><i class=\\\'fi fi-rr-box-alt text-gray-300 text-3xl\\\'></i></div>\'">'
      + '<div class="flex flex-col gap-2">'
      + '<span class="text-sm text-gray-600">โลโก้ปัจจุบัน</span>'
      + '<label class="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-navy-50 text-navy-700 rounded-lg text-sm hover:bg-navy-100 transition"><i class="fi fi-rr-camera"></i> เปลี่ยนรูป<input type="file" id="cfgLogoFile" accept="image/*" class="hidden" onchange="previewLogoChange(this)"></label>'
      + '</div></div>';
  } else {
    html += '<div class="flex items-center gap-3 mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200">'
      + '<div class="w-20 h-20 bg-white rounded-xl flex items-center justify-center border"><i class="fi fi-rr-box-alt text-gray-300 text-3xl"></i></div>'
      + '<label class="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-navy-50 text-navy-700 rounded-lg text-sm hover:bg-navy-100 transition"><i class="fi fi-rr-camera"></i> เลือกรูปโลโก้<input type="file" id="cfgLogoFile" accept="image/*" class="hidden" onchange="previewLogoChange(this)"></label>'
      + '</div>';
  }
  html += '<div id="logoPreviewArea"></div>';
  html += '</div>';
  html += '</div></div>';

  // Section 2: Telegram
  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 flex items-center gap-2"><i class="fi fi-rr-bell text-navy-600"></i> การแจ้งเตือน Telegram</h3></div>';
  html += '<div class="card-body space-y-4">';
  html += '<div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">';
  html += '<p class="font-semibold mb-1">วิธีตั้งค่า Telegram Bot (ฟรี)</p>';
  html += '<ol class="list-decimal list-inside space-y-0.5">';
  html += '<li>ทักหา @BotFather บน Telegram แล้วพิมพ์ /newbot</li>';
  html += '<li>ตั้งชื่อ Bot แล้วคัดลอก Token ที่ได้</li>';
  html += '<li>สร้าง Group/Channel แล้วเพิ่ม Bot เข้าไป</li>';
  html += '<li>ส่งข้อความใดก็ได้ใน Group แล้วเปิด URL: api.telegram.org/bot[TOKEN]/getUpdates เพื่อดู chat_id</li>';
  html += '</ol></div>';
  html += '<div class="flex items-center gap-3"><input type="checkbox" id="cfgTgEnabled" ' + (cfg.telegram_enabled?'checked':'') + ' class="w-4 h-4 rounded accent-navy-700">';
  html += '<label for="cfgTgEnabled" class="text-sm font-medium text-gray-700">เปิดใช้งานการแจ้งเตือน Telegram</label></div>';
  html += fieldHTML('Bot Token', 'cfgTgToken', 'text', cfg.telegram_bot_token||'', '');
  html += fieldHTML('Chat ID (Group/Channel)', 'cfgTgChatId', 'text', cfg.telegram_chat_id||'', '');
  html += '<button onclick="doTestTelegram()" class="btn-secondary btn-sm flex items-center gap-1.5 w-fit"><i class="fi fi-rr-paper-plane"></i> ส่ง Test Message</button>';
  html += '</div></div>';

  // Section 3: สต็อก
  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 flex items-center gap-2"><i class="fi fi-rr-layers text-navy-600"></i> การตั้งค่าสต็อก</h3></div>';
  html += '<div class="card-body">';
  html += fieldHTML('ระดับสต็อกขั้นต่ำเริ่มต้น (ใช้เมื่อไม่ได้กำหนดแต่ละรายการ)', 'cfgLowStock', 'number', cfg.low_stock_threshold||5);
  html += '</div></div>';

  // บันทึก
  html += '<div class="flex justify-end gap-3">';
  html += '<button onclick="renderSettings()" class="btn-secondary"><i class="fi fi-rr-refresh mr-1"></i>รีเซ็ต</button>';
  html += '<button onclick="saveSettings()" class="btn-primary"><i class="fi fi-rr-disk mr-1"></i>บันทึกการตั้งค่า</button></div>';

  html += '</div>';
  document.getElementById('mainContent').innerHTML = html;
}

function saveSettings() {
  var logoFile = document.getElementById('cfgLogoFile');
  function doSave(logoFileId) {
    var data = {
      app_name:              (document.getElementById('cfgAppName')||{}).value||'',
      organization_name:     (document.getElementById('cfgOrgName')||{}).value||'',
      organization_address:  (document.getElementById('cfgOrgAddr')||{}).value||'',
      organization_phone:    (document.getElementById('cfgOrgPhone')||{}).value||'',
      organization_email:    (document.getElementById('cfgOrgEmail')||{}).value||'',
      telegram_enabled:      (document.getElementById('cfgTgEnabled')||{}).checked||false,
      telegram_bot_token:    (document.getElementById('cfgTgToken')||{}).value||'',
      telegram_chat_id:      (document.getElementById('cfgTgChatId')||{}).value||'',
      low_stock_threshold:   parseInt((document.getElementById('cfgLowStock')||{}).value||5)
    };
    if (logoFileId) data.app_logo = logoFileId;
    showLoading('กำลังบันทึก...');
    callAPI('saveConfig', AUTH.token, data).then(function(res) {
      hideLoading();
      if (res.success) {
        document.getElementById('sidebarAppName').textContent = data.app_name || 'ระบบวัสดุสิ้นเปลือง';
        showSuccess(res.message);
        if (logoFileId) { setTimeout(function(){ window.location.reload(); }, 1200); }
      } else showError(res.message);
    }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
  }
  // อัปโหลดโลโก้ก่อน (ถ้ามี)
  if (logoFile && logoFile.files && logoFile.files[0]) {
    var file = logoFile.files[0];
    showLoading('กำลังอัปโหลดโลโก้...');
    var reader = new FileReader();
    reader.onload = function(e) {
      var base64 = e.target.result.split(',')[1];
      callAPI('uploadFile', AUTH.token, base64, file.type, file.name).then(function(res) {
        hideLoading();
        if (res.success) doSave(res.file_id);
        else { showError('อัปโหลดโลโก้ไม่สำเร็จ: ' + res.message); doSave(null); }
      }).catch(function() { doSave(null); });
    };
    reader.readAsDataURL(file);
  } else {
    doSave(null);
  }
}

function previewLogoChange(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var preview = document.getElementById('logoPreviewArea');
    if (preview) {
      preview.innerHTML = '<div class="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">'
        + '<img src="' + e.target.result + '" class="h-20 rounded-xl object-contain border bg-white p-1">'
        + '<div><p class="text-sm font-medium text-green-700">รูปใหม่ที่จะใช้</p><p class="text-xs text-green-600">กด "บันทึกการตั้งค่า" เพื่อยืนยัน</p></div></div>';
    }
  };
  reader.readAsDataURL(file);
}

function doTestTelegram() {
  showLoading('กำลังส่ง Test Message...');
  callAPI('testTelegram', AUTH.token).then(function(res) {
    hideLoading();
    if (res.success) showSuccess(res.message);
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

// getConfig wrapper (ใช้ใน renderSettings)
function getConfig(token) {
  return new Promise(function(resolve) {
    callAPI('getConfig').then(function(cfg) { resolve({ success:true, data:cfg }); }).catch(function() { resolve({ success:false, data:{} }); });
  });
}
</script>
