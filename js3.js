<script>
// ============================================================
// js3.html — Withdraw | Approve | Transactions
// ============================================================

var _wdData   = [];
var _wdPage   = 1;
var _wdFilter = 'all';
var _txData   = [];
var _txPage   = 1;
var _txFilter = { type:'all', date_from:'', date_to:'' };

// ===== WITHDRAW PAGE =====
function renderWithdraw() {
  showLoading('โหลดข้อมูล...');
  Promise.all([
    callAPI('getItems', AUTH.token),
    callAPI('getWithdrawals', AUTH.token, { status:'all' })
  ]).then(function(results) {
    hideLoading();
    _itemsData = results[0].data || [];
    _wdData    = results[1].data || [];
    _wdPage    = 1;
    buildWithdrawPage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildWithdrawPage() {
  var filtered = _wdFilter === 'all' ? _wdData : _wdData.filter(function(w){ return w.status === _wdFilter; });
  var paged    = paginate(filtered, _wdPage);

  var html = '<div class="fade-in space-y-4">';

  // Header + New Withdraw Button
  html += '<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">';
  html += '<h3 class="font-semibold text-gray-700 flex items-center gap-2"><i class="fi fi-rr-inbox-out text-navy-600"></i> รายการคำขอเบิกวัสดุ</h3>';
  html += '<button onclick="openWithdrawSelectModal()" class="btn-primary flex items-center gap-2"><i class="fi fi-rr-plus"></i> ยื่นคำขอเบิก</button></div>';

  // Status filter tabs
  html += '<div class="flex gap-2 border-b">';
  ['all','pending','approved','rejected'].forEach(function(s) {
    var labels = { all:'ทั้งหมด', pending:'รออนุมัติ', approved:'อนุมัติแล้ว', rejected:'ปฏิเสธ' };
    var count  = s === 'all' ? _wdData.length : _wdData.filter(function(w){ return w.status===s; }).length;
    html += '<button onclick="setWdFilter(\'' + s + '\')" class="pb-2.5 px-3 text-sm font-medium border-b-2 transition '
      + (_wdFilter===s ? 'border-navy-700 text-navy-700' : 'border-transparent text-gray-500 hover:text-gray-700') + '">'
      + labels[s] + ' <span class="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">' + count + '</span></button>';
  });
  html += '</div>';

  // Table
  html += '<div class="card overflow-hidden"><div class="overflow-x-auto">';
  html += '<table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
  html += '<tr><th class="px-4 py-3 text-left">เลขที่เบิก</th><th class="px-4 py-3 text-left">วันที่</th>';
  html += '<th class="px-4 py-3 text-left">รายการ</th><th class="px-4 py-3 text-center">ขอ/อนุมัติ</th>';
  html += '<th class="px-4 py-3 text-left">วัตถุประสงค์</th><th class="px-4 py-3 text-left">ผู้ขอ</th>';
  html += '<th class="px-4 py-3 text-center">สถานะ</th>';
  if (AUTH.user.role === 'admin') html += '<th class="px-4 py-3 text-center">จัดการ</th>';
  html += '</tr></thead><tbody class="divide-y divide-gray-100">';

  if (paged.length === 0) {
    html += '<tr><td colspan="' + (AUTH.user.role==='admin'?8:7) + '" class="text-center py-10 text-gray-400">ไม่พบรายการ</td></tr>';
  }
  paged.forEach(function(w) {
    var badgeClass = w.status==='approved'?'badge-approved':w.status==='rejected'?'badge-rejected':'badge-pending';
    var statusLabel = { pending:'รออนุมัติ', approved:'อนุมัติแล้ว', rejected:'ปฏิเสธ' }[w.status]||w.status;
    html += '<tr>';
    html += '<td class="px-4 py-2.5 font-mono text-xs text-navy-700">' + escHtml(w.withdraw_no) + (w.via_qr?'<span class="ml-1 text-teal-600 text-xs" title="สแกน QR"><i class="fi fi-rr-qr-scan"></i></span>':'') + '</td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-500">' + formatDate(w.requested_at) + '</td>';
    html += '<td class="px-4 py-2.5 font-medium text-gray-700 max-w-xs truncate">' + escHtml(w.item_name) + '</td>';
    html += '<td class="px-4 py-2.5 text-center text-xs"><span class="text-gray-800 font-bold">' + w.quantity_requested + '</span>';
    if (w.status==='approved') html += '<span class="text-green-600 ml-1">/' + w.quantity_approved + '</span>';
    html += ' <span class="text-gray-400">' + escHtml(w.unit) + '</span></td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">' + escHtml(w.purpose||'-') + '</td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-600">' + escHtml(w.requested_by_name||'-') + '</td>';
    html += '<td class="px-4 py-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-xs font-medium ' + badgeClass + '">' + statusLabel + '</span></td>';
    if (AUTH.user.role === 'admin') {
      html += '<td class="px-4 py-2.5 text-center"><div class="flex gap-1 justify-center">';
      if (w.status === 'pending') {
        html += '<button onclick="openApproveModal(\'' + w.id + '\',' + w.quantity_requested + ')" class="btn-success btn-sm text-xs"><i class="fi fi-rr-check mr-1"></i>อนุมัติ</button>';
        html += '<button onclick="openRejectModal(\'' + w.id + '\')" class="btn-danger btn-sm text-xs"><i class="fi fi-rr-cross mr-1"></i>ปฏิเสธ</button>';
      } else {
        html += '<span class="text-xs text-gray-400">—</span>';
      }
      html += '</div></td>';
    }
    html += '</tr>';
  });
  html += '</tbody></table></div></div>';

  // Mobile Cards (sm)
  html += '<div class="md:hidden space-y-3" id="wdMobileCards">';
  paged.forEach(function(w) {
    var badgeClass = w.status==='approved'?'badge-approved':w.status==='rejected'?'badge-rejected':'badge-pending';
    var statusLabel = { pending:'รออนุมัติ', approved:'อนุมัติแล้ว', rejected:'ปฏิเสธ' }[w.status]||w.status;
    html += '<div class="card p-4 space-y-2">';
    html += '<div class="flex items-start justify-between">';
    html += '<div><p class="font-semibold text-gray-800 text-sm">' + escHtml(w.item_name) + '</p>';
    html += '<p class="text-xs text-navy-700 font-mono">' + escHtml(w.withdraw_no) + '</p></div>';
    html += '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + badgeClass + '">' + statusLabel + '</span></div>';
    html += '<div class="grid grid-cols-2 gap-1 text-xs text-gray-500">';
    html += '<span><i class="fi fi-rr-calendar-day mr-1"></i>' + formatDate(w.requested_at) + '</span>';
    html += '<span><i class="fi fi-rr-layers mr-1"></i>' + w.quantity_requested + ' ' + escHtml(w.unit) + '</span>';
    html += '<span><i class="fi fi-rr-user mr-1"></i>' + escHtml(w.requested_by_name||'-') + '</span>';
    html += '<span><i class="fi fi-rr-target mr-1"></i>' + escHtml(w.purpose||'-') + '</span></div>';
    if (AUTH.user.role==='admin' && w.status==='pending') {
      html += '<div class="flex gap-2 pt-1">';
      html += '<button onclick="openApproveModal(\'' + w.id + '\',' + w.quantity_requested + ')" class="flex-1 btn-success btn-sm text-xs">อนุมัติ</button>';
      html += '<button onclick="openRejectModal(\'' + w.id + '\')" class="flex-1 btn-danger btn-sm text-xs">ปฏิเสธ</button></div>';
    }
    html += '</div>';
  });
  html += '</div>';

  html += '<div id="wdPagination"></div></div>';
  document.getElementById('mainContent').innerHTML = html;
  renderPagination('wdPagination', filtered.length, _wdPage, function(p){ _wdPage=p; buildWithdrawPage(); });
}

function setWdFilter(f) { _wdFilter=f; _wdPage=1; buildWithdrawPage(); }

// Modal เลือกวัสดุก่อนเบิก
function openWithdrawSelectModal() {
  if (_itemsData.length === 0) {
    showLoading('โหลด...');
    callAPI('getItems', AUTH.token).then(function(res){ hideLoading(); _itemsData = res.data||[]; _openWdSelect(); });
  } else _openWdSelect();
}
function _openWdSelect() {
  var body = '<div class="space-y-3">'
    + '<div class="relative"><i class="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>'
    + '<input type="text" id="wdItemSearch" placeholder="ค้นหาวัสดุ..." onkeyup="filterWdItemList()" class="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"></div>'
    + '<div id="wdItemList" class="max-h-72 overflow-y-auto space-y-1">' + buildWdItemList(_itemsData) + '</div></div>';
  openModal('เลือกรายการวัสดุที่ต้องการเบิก', body, '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>');
}
function buildWdItemList(data) {
  if (data.length === 0) return '<p class="text-center text-sm text-gray-400 py-4">ไม่พบรายการ</p>';
  return data.map(function(i) {
    var sClass = getStockClass(i.current_stock, i.min_stock);
    var imgHtml = i.image_file_id ? '<img src="https://drive.google.com/thumbnail?id=' + i.image_file_id + '&sz=w200-h200" class="w-9 h-9 object-cover rounded-xl border border-gray-200 flex-shrink-0">' : '<div class="w-9 h-9 bg-navy-100 rounded-xl flex items-center justify-center flex-shrink-0"><i class="fi fi-rr-box-open-full text-navy-700 text-sm"></i></div>';
    return '<div onclick="selectWdItem(\'' + i.id + '\')" class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-navy-50 border border-transparent hover:border-navy-200 transition">'
      + imgHtml
      + '<div class="flex-1 min-w-0"><p class="text-sm font-medium text-gray-700 truncate">' + escHtml(i.name) + '</p>'
      + '<p class="text-xs text-gray-400">' + escHtml(i.item_code) + ' • ' + escHtml(i.size||'') + ' • ' + i.current_stock + ' ' + i.unit + '</p></div>'
      + '<span class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ' + sClass + '">' + getStockLabel(i.current_stock, i.min_stock) + '</span></div>';
  }).join('');
}
function filterWdItemList() {
  var q = (document.getElementById('wdItemSearch')||{}).value||'';
  var filtered = _itemsData.filter(function(i){ return !q || i.name.toLowerCase().includes(q.toLowerCase()) || (i.item_code||'').includes(q); });
  document.getElementById('wdItemList').innerHTML = buildWdItemList(filtered);
}
function selectWdItem(id) {
  closeModal();
  openWithdrawModal(id);
}

// Submit Withdraw (common)
function submitWithdraw() {
  var itemId  = (document.getElementById('wdItemId')||{}).value||'';
  var qty     = parseInt((document.getElementById('wdQty')||{}).value||0);
  var purpose = (document.getElementById('wdPurpose')||{}).value||'';
  var note    = (document.getElementById('wdNote')||{}).value||'';
  var viaQr   = (document.getElementById('wdViaQr')||{}).value==='true';
  if (!itemId) { showError('ไม่พบรายการวัสดุ'); return; }
  if (!qty || qty <= 0) { showError('กรุณาระบุจำนวนที่ถูกต้อง'); return; }
  if (!purpose) { showError('กรุณาระบุวัตถุประสงค์'); return; }
  showLoading('กำลังยื่นคำขอ...');
  callAPI('addWithdrawal', AUTH.token, { item_id:itemId, quantity:qty, purpose:purpose, note:note, via_qr:viaQr }).then(function(res) {
    hideLoading(); closeModal();
    if (res.success) {
      showSuccess('ยื่นคำขอ ' + res.withdraw_no + ' เรียบร้อย รอการอนุมัติ');
      if (_currentPage === 'withdraw') renderWithdraw();
      else if (_currentPage === 'dashboard') renderDashboard();
    } else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

// ===== APPROVE PAGE =====
var _approveData = [];
var _approvePage = 1;

function renderApprove() {
  if (AUTH.user.role !== 'admin') { loadPage('dashboard'); return; }
  showLoading('โหลดคำขอเบิก...');
  callAPI('getWithdrawals', AUTH.token, { status:'all' }).then(function(res) {
    hideLoading();
    _approveData = res.data || [];
    _approvePage = 1;
    buildApprovePage('pending');
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildApprovePage(filterStatus) {
  filterStatus = filterStatus || 'pending';
  var data    = _approveData.filter(function(w){ return filterStatus==='all'?true:w.status===filterStatus; });
  var paged   = paginate(data, _approvePage);
  var pendingCount = _approveData.filter(function(w){ return w.status==='pending'; }).length;

  var html = '<div class="fade-in space-y-4">';
  html += '<div class="flex items-center justify-between">';
  html += '<h3 class="font-semibold text-gray-700 flex items-center gap-2"><i class="fi fi-rr-check-circle text-navy-600"></i> อนุมัติการเบิกวัสดุ';
  if (pendingCount > 0) html += ' <span class="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">' + pendingCount + '</span>';
  html += '</h3>';
  html += '<div class="flex gap-2">';
  ['pending','approved','rejected','all'].forEach(function(s){
    var labels = {pending:'รอดำเนินการ',approved:'อนุมัติแล้ว',rejected:'ปฏิเสธแล้ว',all:'ทั้งหมด'};
    html += '<button onclick="buildApprovePage(\'' + s + '\')" class="px-3 py-1.5 rounded-xl text-xs font-medium border transition '
      + (filterStatus===s?'bg-navy-700 text-white border-navy-700':'border-gray-300 text-gray-600 hover:bg-gray-50') + '">' + labels[s] + '</button>';
  });
  html += '</div></div>';

  if (paged.length === 0) {
    html += '<div class="card p-12 text-center"><i class="fi fi-rr-check-circle text-5xl text-green-400 block mb-3"></i><p class="text-gray-500">ไม่มีรายการ' + (filterStatus==='pending'?' รออนุมัติ':'') + '</p></div>';
  } else {
    paged.forEach(function(w) {
      var badgeClass = w.status==='approved'?'badge-approved':w.status==='rejected'?'badge-rejected':'badge-pending';
      var statusLabel = {pending:'รออนุมัติ',approved:'อนุมัติแล้ว',rejected:'ปฏิเสธ'}[w.status]||w.status;
      html += '<div class="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">';
      html += '<div class="w-12 h-12 bg-' + (w.status==='pending'?'amber':'gray') + '-100 rounded-xl flex items-center justify-center flex-shrink-0">';
      html += '<i class="fi fi-rr-inbox-out text-' + (w.status==='pending'?'amber':'gray') + '-600 text-xl"></i></div>';
      html += '<div class="flex-1 min-w-0"><div class="flex flex-wrap items-center gap-2 mb-1">';
      html += '<span class="font-bold text-gray-800 text-sm">' + escHtml(w.item_name) + '</span>';
      html += '<span class="font-mono text-xs text-navy-600">#' + escHtml(w.withdraw_no) + '</span>';
      html += '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + badgeClass + '">' + statusLabel + '</span>';
      if (w.via_qr) html += '<span class="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full"><i class="fi fi-rr-qr-scan mr-0.5"></i>QR</span>';
      html += '</div>';
      html += '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500">';
      html += '<span><i class="fi fi-rr-user mr-1"></i>' + escHtml(w.requested_by_name||'-') + '</span>';
      html += '<span><i class="fi fi-rr-layers mr-1"></i>' + w.quantity_requested + ' ' + escHtml(w.unit) + '</span>';
      html += '<span><i class="fi fi-rr-target mr-1"></i>' + escHtml(w.purpose||'-') + '</span>';
      html += '<span><i class="fi fi-rr-calendar-day mr-1"></i>' + formatDate(w.requested_at) + '</span>';
      html += '</div>';
      if (w.status === 'approved') {
        html += '<p class="text-xs text-green-700 mt-1"><i class="fi fi-rr-check mr-1"></i>อนุมัติ ' + w.quantity_approved + ' ' + w.unit + ' โดย ' + escHtml(w.approved_by_name||'-') + ' เมื่อ ' + formatDate(w.approved_at) + '</p>';
      }
      if (w.status === 'rejected' && w.reject_reason) {
        html += '<p class="text-xs text-red-700 mt-1"><i class="fi fi-rr-cross mr-1"></i>เหตุผล: ' + escHtml(w.reject_reason) + '</p>';
      }
      html += '</div>';
      if (w.status === 'pending') {
        html += '<div class="flex gap-2 flex-shrink-0">';
        html += '<button onclick="openApproveModal(\'' + w.id + '\',' + w.quantity_requested + ')" class="btn-success flex items-center gap-1.5"><i class="fi fi-rr-check"></i> อนุมัติ</button>';
        html += '<button onclick="openRejectModal(\'' + w.id + '\')" class="btn-danger flex items-center gap-1.5"><i class="fi fi-rr-cross"></i> ปฏิเสธ</button>';
        html += '</div>';
      }
      html += '</div>';
    });
  }
  html += '<div id="approvePagination"></div></div>';
  document.getElementById('mainContent').innerHTML = html;
  renderPagination('approvePagination', data.length, _approvePage, function(p){ _approvePage=p; buildApprovePage(filterStatus); });
}

function openApproveModal(wdId, qty) {
  var body = '<div class="space-y-4">'
    + '<p class="text-sm text-gray-600">ยืนยันอนุมัติคำขอเบิก? คุณสามารถปรับจำนวนที่อนุมัติได้</p>'
    + '<div><label class="form-label">จำนวนที่อนุมัติ *</label>'
    + '<input type="number" id="approveQty" value="' + qty + '" min="1" max="' + qty + '" class="form-input">'
    + '<p class="text-xs text-gray-400 mt-1">จำนวนที่ขอ: ' + qty + '</p></div></div>';
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="doApprove(\'' + wdId + '\')" class="btn-success"><i class="fi fi-rr-check mr-1"></i>ยืนยันอนุมัติ</button>';
  openModal('อนุมัติการเบิก', body, footer);
}

function doApprove(wdId) {
  var qty = parseInt((document.getElementById('approveQty')||{}).value||0);
  if (!qty || qty <= 0) { showError('กรุณาระบุจำนวน'); return; }
  closeModal();
  showLoading('กำลังอนุมัติ...');
  callAPI('approveWithdrawal', AUTH.token, wdId, qty).then(function(res) {
    hideLoading();
    if (res.success) { showSuccess(res.message); renderApprove(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

function openRejectModal(wdId) {
  var body = '<div class="space-y-3">'
    + '<p class="text-sm text-gray-600">กรุณาระบุเหตุผลที่ปฏิเสธคำขอเบิกนี้</p>'
    + '<div><label class="form-label">เหตุผล *</label>'
    + '<input type="text" id="rejectReason" placeholder="ระบุเหตุผล..." class="form-input"></div></div>';
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="doReject(\'' + wdId + '\')" class="btn-danger"><i class="fi fi-rr-cross mr-1"></i>ยืนยันปฏิเสธ</button>';
  openModal('ปฏิเสธคำขอเบิก', body, footer);
}

function doReject(wdId) {
  var reason = (document.getElementById('rejectReason')||{}).value||'';
  if (!reason.trim()) { showError('กรุณาระบุเหตุผล'); return; }
  closeModal();
  showLoading('กำลังดำเนินการ...');
  callAPI('rejectWithdrawal', AUTH.token, wdId, reason).then(function(res) {
    hideLoading();
    if (res.success) { showSuccess(res.message); renderApprove(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

// ===== TRANSACTIONS PAGE =====
function renderTransactions() {
  showLoading('โหลดประวัติ...');
  callAPI('getTransactions', AUTH.token, {}).then(function(res) {
    hideLoading();
    _txData = res.data || [];
    _txPage = 1;
    buildTransactionsPage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildTransactionsPage() {
  var filtered = applyTxFilter(_txData);
  var paged    = paginate(filtered, _txPage);

  var html = '<div class="fade-in space-y-4">';
  // Filters
  html += '<div class="card p-4"><div class="flex flex-wrap gap-3 items-end">';
  html += '<div><label class="form-label">ประเภท</label><select id="txTypeFilter" onchange="applyTxFilterUI()" class="form-input w-36">';
  ['all','receive','withdraw'].forEach(function(t){
    var labels={all:'ทั้งหมด',receive:'รับเข้า',withdraw:'เบิกออก'};
    html += '<option value="' + t + '" ' + (_txFilter.type===t?'selected':'') + '>' + labels[t] + '</option>';
  });
  html += '</select></div>';
  html += '<div><label class="form-label">จากวันที่</label><input type="date" id="txDateFrom" value="' + _txFilter.date_from + '" onchange="applyTxFilterUI()" class="form-input w-40"></div>';
  html += '<div><label class="form-label">ถึงวันที่</label><input type="date" id="txDateTo" value="' + _txFilter.date_to + '" onchange="applyTxFilterUI()" class="form-input w-40"></div>';
  html += '<button onclick="clearTxFilter()" class="btn-secondary btn-sm"><i class="fi fi-rr-refresh mr-1"></i>ล้างตัวกรอง</button>';
  html += '</div></div>';

  // Summary chips
  var totalR = filtered.filter(function(t){ return t.type==='receive'; }).length;
  var totalW = filtered.filter(function(t){ return t.type==='withdraw'; }).length;
  html += '<div class="flex gap-2 text-xs">';
  html += '<span class="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full"><i class="fi fi-rr-inbox-in mr-1"></i>รับเข้า: ' + totalR + '</span>';
  html += '<span class="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full"><i class="fi fi-rr-inbox-out mr-1"></i>เบิกออก: ' + totalW + '</span>';
  html += '<span class="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">ทั้งหมด: ' + filtered.length + '</span></div>';

  // Table
  html += '<div class="card overflow-hidden"><div class="overflow-x-auto">';
  html += '<table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
  html += '<tr><th class="px-4 py-3 text-left">วันที่</th><th class="px-4 py-3 text-center">ประเภท</th>';
  html += '<th class="px-4 py-3 text-left">เลขที่อ้างอิง</th><th class="px-4 py-3 text-left">รายการ</th>';
  html += '<th class="px-4 py-3 text-center">จำนวน</th><th class="px-4 py-3 text-center">ก่อน</th>';
  html += '<th class="px-4 py-3 text-center">หลัง</th><th class="px-4 py-3 text-left">ผู้ดำเนินการ</th></tr></thead>';
  html += '<tbody class="divide-y divide-gray-100">';
  if (paged.length === 0) html += '<tr><td colspan="8" class="text-center py-10 text-gray-400">ไม่พบรายการ</td></tr>';
  paged.forEach(function(t) {
    var isR = t.type === 'receive';
    html += '<tr>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">' + formatDate(t.date) + '</td>';
    html += '<td class="px-4 py-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-xs font-medium ' + (isR?'badge-receive':'badge-withdraw') + '">' + (isR?'รับเข้า':'เบิกออก') + '</span></td>';
    html += '<td class="px-4 py-2.5 font-mono text-xs text-navy-700">' + escHtml(t.ref_id||'-') + '</td>';
    html += '<td class="px-4 py-2.5 font-medium text-gray-700 max-w-xs">' + escHtml(t.item_name||'-') + '</td>';
    html += '<td class="px-4 py-2.5 text-center font-bold ' + (isR?'text-blue-700':'text-purple-700') + '">' + (isR?'+':'-') + t.quantity + '</td>';
    html += '<td class="px-4 py-2.5 text-center text-xs text-gray-500">' + (t.stock_before||0) + '</td>';
    html += '<td class="px-4 py-2.5 text-center text-xs font-bold text-gray-700">' + (t.stock_after||0) + '</td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-500">' + escHtml(t.actor_name||'-') + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div></div>';
  html += '<div id="txPagination"></div></div>';
  document.getElementById('mainContent').innerHTML = html;
  renderPagination('txPagination', filtered.length, _txPage, function(p){ _txPage=p; buildTransactionsPage(); });
}

function applyTxFilter(data) {
  return data.filter(function(t) {
    if (_txFilter.type !== 'all' && t.type !== _txFilter.type) return false;
    if (_txFilter.date_from && (t.date||'') < _txFilter.date_from) return false;
    if (_txFilter.date_to   && (t.date||'') > _txFilter.date_to)   return false;
    return true;
  });
}
function applyTxFilterUI() {
  _txFilter.type      = (document.getElementById('txTypeFilter')||{}).value||'all';
  _txFilter.date_from = (document.getElementById('txDateFrom')||{}).value||'';
  _txFilter.date_to   = (document.getElementById('txDateTo')||{}).value||'';
  _txPage = 1;
  buildTransactionsPage();
}
function clearTxFilter() {
  _txFilter = { type:'all', date_from:'', date_to:'' };
  _txPage   = 1;
  buildTransactionsPage();
}
</script>
