// ============================================================
// app.js — Frontend (Static Site)
// ============================================================

// callAPI ถูก define ใน api.js แล้ว

// ===== CONSTANTS =====
var ITEMS_PER_PAGE = 20;
var ROLE_LABELS = { admin:'ผู้ดูแลระบบ', staff:'เจ้าหน้าที่คลัง', employee:'พนักงาน' };

// ===== URL PARAMS (for QR) =====
var _QR_ACTION = '';
var _QR_ITEM_ID = '';

// ===== AUTH =====
var AUTH = {
  token: localStorage.getItem('sup_token') || '',
  user:  JSON.parse(localStorage.getItem('sup_user')  || 'null'),
  set: function(token, user) {
    AUTH.token = token; AUTH.user = user;
    localStorage.setItem('sup_token', token);
    localStorage.setItem('sup_user', JSON.stringify(user));
  },
  clear: function() {
    AUTH.token = ''; AUTH.user = null;
    localStorage.removeItem('sup_token');
    localStorage.removeItem('sup_user');
  },
  hasRole: function(roles) {
    if (!AUTH.user) return false;
    if (!Array.isArray(roles)) roles = [roles];
    return roles.indexOf(AUTH.user.role) !== -1;
  }
};

// ===== LOADING =====
function showLoading(text) {
  document.getElementById('loadingText').textContent = text || 'กำลังโหลด...';
  document.getElementById('loadingOverlay').classList.remove('hidden');
}
function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

// ===== ALERTS =====
function showSuccess(msg) { Swal.fire({ icon:'success', title:'สำเร็จ', text:msg, timer:2000, showConfirmButton:false, customClass:{popup:'swal2-popup'} }); }
function showError(msg)   { Swal.fire({ icon:'error', title:'เกิดข้อผิดพลาด', text:msg, customClass:{popup:'swal2-popup'} }); }
function showConfirm(title, text, cb, confirmText) {
  Swal.fire({
    title:title, text:text, icon:'warning', showCancelButton:true,
    confirmButtonText: confirmText||'ยืนยัน', cancelButtonText:'ยกเลิก',
    reverseButtons:true, customClass:{popup:'swal2-popup'}
  }).then(function(r){ if(r.isConfirmed) cb(); });
}

// ===== MODAL =====
function openModal(title, bodyHtml, footerHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml || '';
  document.getElementById('modalOverlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.getElementById('modalBody').innerHTML = '';
  document.getElementById('modalFooter').innerHTML = '';
}

// ===== UTILITIES =====
function formatDate(iso) {
  if (!iso) return '-';
  var d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric' });
}
function formatDateTime(iso) {
  if (!iso) return '-';
  var d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('th-TH', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function togglePass(inputId, btn) {
  var inp = document.getElementById(inputId);
  var isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  btn.querySelector('i').className = isPass ? 'fi fi-rr-eye-crossed text-sm' : 'fi fi-rr-eye text-sm';
}
function getStockClass(stock, min) {
  if (stock <= 0) return 'stock-critical';
  if (stock <= min) return 'stock-low';
  return 'stock-ok';
}
function getStockLabel(stock, min) {
  if (stock <= 0) return 'หมด';
  if (stock <= min) return 'ใกล้หมด';
  return 'ปกติ';
}
function imgUrl(fileId, size) {
  if (!fileId) return '';
  return getFileDataUrl(fileId) || '';
}

// ===== PAGINATION =====
function renderPagination(containerId, total, currentPage, onPageClick) {
  var totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  if (totalPages <= 1) { document.getElementById(containerId).innerHTML = ''; return; }
  var html = '<div class="flex items-center justify-between mt-4">';
  html += '<p class="text-xs text-gray-500">ทั้งหมด ' + total + ' รายการ</p>';
  html += '<div class="flex gap-1">';
  if (currentPage > 1) html += '<button class="page-btn" onclick="(' + onPageClick + ')(' + (currentPage-1) + ')"><i class="fi fi-rr-angle-left"></i></button>';
  var start = Math.max(1, currentPage-2), end = Math.min(totalPages, currentPage+2);
  for (var p = start; p <= end; p++) {
    html += '<button class="page-btn ' + (p===currentPage?'active':'') + '" onclick="(' + onPageClick + ')(' + p + ')">' + p + '</button>';
  }
  if (currentPage < totalPages) html += '<button class="page-btn" onclick="(' + onPageClick + ')(' + (currentPage+1) + ')"><i class="fi fi-rr-angle-right"></i></button>';
  html += '</div></div>';
  document.getElementById(containerId).innerHTML = html;
}

// ===== LOGIN =====
function setLoginRole(role) {
  document.getElementById('loginRole').value = role;
  ['admin','staff','employee'].forEach(function(r) {
    var tab = document.getElementById('tab' + r.charAt(0).toUpperCase() + r.slice(1));
    if (r === role) { tab.className = 'role-tab active-tab flex-1 py-3.5 text-sm font-semibold text-center transition-all border-b-2'; }
    else            { tab.className = 'role-tab flex-1 py-3.5 text-sm font-semibold text-center transition-all border-b-2 border-transparent text-gray-400 hover:text-gray-600'; }
  });
}

function doLogin() {
  var username = document.getElementById('loginUsername').value.trim();
  var password = document.getElementById('loginPassword').value;
  var role     = document.getElementById('loginRole').value;
  if (!username || !password) { showError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'); return; }
  var btn = document.getElementById('btnLogin');
  btn.disabled = true; btn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> กำลังเข้าสู่ระบบ...';
  callAPI('login', username, password, role).then(function(res) {
    btn.disabled = false; btn.innerHTML = '<i class="fi fi-rr-sign-in"></i> เข้าสู่ระบบ';
    if (res.success) {
      AUTH.set(res.token, res.user);
      initApp();
    } else { showError(res.message); }
  }).catch(function(err) {
    btn.disabled = false; btn.innerHTML = '<i class="fi fi-rr-sign-in"></i> เข้าสู่ระบบ';
    showError('ไม่สามารถเชื่อมต่อระบบได้');
  });
}

function doLogout() {
  showConfirm('ออกจากระบบ', 'ต้องการออกจากระบบใช่หรือไม่?', function() {
    showLoading('กำลังออกจากระบบ...');
    callAPI('logout', AUTH.token).then(function() {
      AUTH.clear(); location.reload();
    });
  }, 'ออกจากระบบ');
}

function showForgotModal()  { document.getElementById('forgotModal').classList.remove('hidden'); }
function closeForgotModal() { document.getElementById('forgotModal').classList.add('hidden'); }
function submitForgotPassword() {
  var email = document.getElementById('forgotEmail').value.trim();
  if (!email) { showError('กรุณากรอกอีเมล'); return; }
  showLoading('กำลังส่งรหัสผ่านชั่วคราว...');
  callAPI('forgotPassword', email).then(function(res) {
    hideLoading(); closeForgotModal();
    if (res.success) showSuccess(res.message);
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

// ===== APP INIT =====
function initApp() {
  showLoading('กำลังตรวจสอบสิทธิ์...');
  callAPI('validateSession', AUTH.token).then(function(session) {
    hideLoading();
    if (!session) { AUTH.clear(); showLoginPage(); return; }
    AUTH.user = { id: session.user_id, username: session.username, role: session.role, name: session.name };
    localStorage.setItem('sup_user', JSON.stringify(AUTH.user));
    showMainShell();
    loadPage('dashboard');
    // QR action จาก URL
    if (_QR_ACTION === 'withdraw' && _QR_ITEM_ID) {
      setTimeout(function() { openWithdrawFromQR(_QR_ITEM_ID); }, 800);
    }
  }).catch(function() { hideLoading(); showLoginPage(); });
}

function showLoginPage() {
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('mainShell').classList.add('hidden');
}

function showMainShell() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('mainShell').classList.remove('hidden');
  document.getElementById('sidebarName').textContent = AUTH.user.name || AUTH.user.username;
  document.getElementById('sidebarRole').textContent = ROLE_LABELS[AUTH.user.role] || AUTH.user.role;
  var isAdmin  = AUTH.user.role === 'admin';
  var isStaff  = AUTH.user.role === 'staff';
  var notEmp   = AUTH.user.role !== 'employee';
  document.getElementById('menuItems').style.display    = isAdmin ? '' : 'none';
  document.getElementById('menuReceive').style.display  = notEmp  ? '' : 'none';
  document.getElementById('menuApprove').style.display  = isAdmin ? '' : 'none';
  document.getElementById('menuAdminSection').style.display = isAdmin ? '' : 'none';
  document.getElementById('menuReportLabel').style.display  = notEmp ? '' : 'none';
  document.getElementById('menuReportSection').style.display= notEmp ? '' : 'none';
  updateClock();
  setInterval(updateClock, 60000);
}

function updateClock() {
  var el = document.getElementById('topDateTime');
  if (el) el.textContent = new Date().toLocaleString('th-TH', { weekday:'short', year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ===== NAVIGATION =====
var _currentPage = '';
var _pageCache   = {};

function loadPage(page) {
  _currentPage = page;
  document.querySelectorAll('.menu-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-page') === page);
  });
  var titles = {
    dashboard:'ภาพรวมระบบ', stock:'สต็อกคงเหลือ', items:'รายการวัสดุ',
    receive:'รับวัสดุเข้าคลัง', withdraw:'เบิกวัสดุ', approve:'อนุมัติการเบิก',
    transactions:'ประวัติเคลื่อนไหว', reports:'รายงาน', qrscanner:'สแกน QR',
    users:'จัดการผู้ใช้งาน', settings:'ตั้งค่าระบบ', profile:'โปรไฟล์'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  document.getElementById('pageBreadcrumb').textContent = 'ระบบวัสดุสิ้นเปลือง / ' + (titles[page] || page);
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.add('hidden');
  var content = document.getElementById('mainContent');
  content.innerHTML = '<div class="flex items-center justify-center py-16"><div class="w-8 h-8 border-4 border-navy-600 border-t-transparent rounded-full animate-spin"></div></div>';
  // render ทันที ไม่ต้องรอ setTimeout
  if (page === 'dashboard')    renderDashboard();
  else if (page === 'stock')        renderStock();
  else if (page === 'items')        renderItems();
  else if (page === 'receive')      renderReceive();
  else if (page === 'withdraw')     renderWithdraw();
  else if (page === 'approve')      renderApprove();
  else if (page === 'transactions') renderTransactions();
  else if (page === 'reports')      renderReports();
  else if (page === 'users')        renderUsers();
  else if (page === 'settings')     renderSettings();
  else if (page === 'profile')      renderProfile();
  else if (page === 'qrscanner')    renderQRScanner();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('hidden');
}

// ===== DASHBOARD =====
var _charts = {};

function renderDashboard() {
  showLoading('โหลดข้อมูล Dashboard...');
  callAPI('getDashboardStats', AUTH.token).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    var d  = res;
    var kpi= res.kpi;

    var badge = document.getElementById('pendingBadge');
    if (kpi.pending > 0) { badge.textContent = kpi.pending; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }

    var html = '<div class="fade-in space-y-5">';

    if (d.low_stock_items && d.low_stock_items.length > 0) {
      html += '<div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">';
      html += '<i class="fi fi-rr-triangle-warning text-amber-500 text-lg mt-0.5 flex-shrink-0"></i>';
      html += '<div class="flex-1">';
      html += '<p class="font-semibold text-amber-800 text-sm">วัสดุใกล้หมด/หมดสต็อก</p>';
      html += '<p class="text-xs text-amber-700 mt-1">' + d.low_stock_items.map(function(i){ return i.name + ' (เหลือ ' + i.current_stock + ' ' + i.unit + ')'; }).join(' • ') + '</p>';
      html += '</div></div>';
    }

    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">';
    var kpis = [
      { label:'รายการวัสดุ', value:kpi.total_items, icon:'fi-rr-box-open-full', color:'bg-blue-100', iconColor:'text-blue-600', danger:false },
      { label:'สต็อกต่ำ/หมด', value:kpi.low_stock, icon:'fi-rr-triangle-warning', color:'bg-amber-100', iconColor:'text-amber-600', danger: kpi.low_stock > 0 },
      { label:'รออนุมัติ', value:kpi.pending, icon:'fi-rr-time-forward', color:'bg-purple-100', iconColor:'text-purple-600', danger: kpi.pending > 0 },
      { label:'เคลื่อนไหววันนี้', value:kpi.today_tx, icon:'fi-rr-activity', color:'bg-green-100', iconColor:'text-green-600', danger:false }
    ];
    kpis.forEach(function(k) {
      html += '<div class="card kpi-card p-4">';
      html += '<div class="flex items-center justify-between mb-3">';
      html += '<div class="w-11 h-11 ' + k.color + ' rounded-xl flex items-center justify-center"><i class="fi ' + k.icon + ' ' + k.iconColor + ' text-xl"></i></div>';
      if (k.danger && k.value > 0) html += '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">!</span>';
      html += '</div>';
      html += '<p class="text-2xl font-bold text-gray-800">' + k.value + '</p>';
      html += '<p class="text-xs text-gray-500 mt-0.5">' + k.label + '</p>';
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="card">';
    html += '<div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-arrow-right text-navy-600"></i> Workflow การเบิกวัสดุ</h3></div>';
    html += '<div class="card-body"><div class="flex items-center justify-center gap-2 flex-wrap">';
    var wfSteps = [
      { label:'ยื่นขอ', color:'bg-blue-500', icon:'fi-rr-inbox-out' },
      { label:'รออนุมัติ', color:'bg-amber-500', icon:'fi-rr-time-forward' },
      { label:'อนุมัติ', color:'bg-green-500', icon:'fi-rr-check-circle' },
      { label:'จ่ายวัสดุ', color:'bg-purple-500', icon:'fi-rr-hand-holding-box' },
      { label:'เสร็จสิ้น', color:'bg-teal-500', icon:'fi-rr-badge-check' }
    ];
    var wfCounts = [kpi.pending + (kpi.today_tx||0), kpi.pending, 0, kpi.today_tx, 0];
    wfSteps.forEach(function(s, i) {
      html += '<div class="text-center"><div class="wf-bubble ' + s.color + ' mx-auto"><i class="fi ' + s.icon + ' text-base"></i></div>';
      html += '<p class="text-xs text-gray-600 mt-1">' + s.label + '</p>';
      html += '<p class="text-sm font-bold text-navy-700">' + (wfCounts[i]||0) + '</p></div>';
      if (i < wfSteps.length-1) html += '<i class="fi fi-rr-angle-right wf-arrow mt-3"></i>';
    });
    html += '</div></div></div>';

    html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">';
    html += '<div class="card lg:col-span-2"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-chart-histogram text-navy-600"></i> สถิติรับ-เบิก 6 เดือนล่าสุด</h3></div>';
    html += '<div class="card-body"><div style="position:relative;height:220px"><canvas id="chartMonthly"></canvas></div></div></div>';
    html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-chart-pie text-navy-600"></i> สัดส่วนวัสดุ</h3></div>';
    html += '<div class="card-body"><div style="position:relative;height:220px"><canvas id="chartCategory"></canvas></div></div></div>';
    html += '</div>';

    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">';

    html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm">รายการเคลื่อนไหวล่าสุด</h3>';
    html += '<button onclick="loadPage(\'transactions\')" class="text-xs text-navy-600 hover:underline">ดูทั้งหมด</button></div>';
    html += '<div class="card-body p-0"><div class="divide-y">';
    if (d.recent_transactions && d.recent_transactions.length > 0) {
      d.recent_transactions.slice(0,6).forEach(function(t) {
        var isR = t.type === 'receive';
        html += '<div class="flex items-center gap-3 px-4 py-3">';
        html += '<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ' + (isR ? 'bg-blue-100':'bg-purple-100') + '">';
        html += '<i class="fi ' + (isR?'fi-rr-inbox-in text-blue-600':'fi-rr-inbox-out text-purple-600') + ' text-sm"></i></div>';
        html += '<div class="flex-1 min-w-0"><p class="text-xs font-medium text-gray-700 truncate">' + escHtml(t.item_name) + '</p>';
        html += '<p class="text-xs text-gray-400">' + (isR?'+':'-') + t.quantity + ' ' + t.unit + ' • ' + (t.actor_name||'-') + '</p></div>';
        html += '<span class="text-xs text-gray-400 flex-shrink-0">' + formatDate(t.date) + '</span></div>';
      });
    } else { html += '<p class="text-center text-xs text-gray-400 py-6">ยังไม่มีรายการ</p>'; }
    html += '</div></div></div>';

    html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm">คำขอเบิกรออนุมัติ</h3>';
    if (AUTH.user.role === 'admin') html += '<button onclick="loadPage(\'approve\')" class="text-xs text-navy-600 hover:underline">จัดการ</button>';
    html += '</div><div class="card-body p-0"><div class="divide-y">';
    if (d.recent_pending && d.recent_pending.length > 0) {
      d.recent_pending.forEach(function(w) {
        html += '<div class="flex items-center gap-3 px-4 py-3">';
        html += '<div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fi fi-rr-time-forward text-amber-600 text-sm"></i></div>';
        html += '<div class="flex-1 min-w-0"><p class="text-xs font-medium text-gray-700 truncate">' + escHtml(w.item_name) + '</p>';
        html += '<p class="text-xs text-gray-400">' + w.quantity_requested + ' ' + w.unit + ' • ' + escHtml(w.requested_by_name) + '</p></div>';
        if (AUTH.user.role === 'admin') {
          html += '<div class="flex gap-1 flex-shrink-0">';
          html += '<button onclick="quickApprove(\'' + w.id + '\',' + w.quantity_requested + ')" class="btn-success btn-sm text-xs px-2 py-1 rounded-lg"><i class="fi fi-rr-check"></i></button>';
          html += '<button onclick="quickReject(\'' + w.id + '\')" class="btn-danger btn-sm text-xs px-2 py-1 rounded-lg"><i class="fi fi-rr-cross"></i></button></div>';
        }
        html += '</div>';
      });
    } else { html += '<p class="text-center text-xs text-gray-400 py-6">ไม่มีคำขอรออนุมัติ</p>'; }
    html += '</div></div></div>';

    html += '</div>';

    if (d.top_items && d.top_items.length > 0) {
      html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-star text-amber-500"></i> Top 5 วัสดุที่เบิกมากสุด</h3></div>';
      html += '<div class="card-body space-y-3">';
      var maxQty = d.top_items[0].qty || 1;
      d.top_items.forEach(function(item, idx) {
        var pct = Math.round(item.qty / maxQty * 100);
        html += '<div class="flex items-center gap-3">';
        html += '<span class="text-xs font-bold text-gray-400 w-4 text-right">' + (idx+1) + '</span>';
        html += '<div class="flex-1"><p class="text-xs font-medium text-gray-700 mb-1 truncate">' + escHtml(item.name) + '</p>';
        html += '<div class="progress-bar"><div class="progress-fill bg-navy-600" style="width:' + pct + '%"></div></div></div>';
        html += '<span class="text-xs font-bold text-navy-700 w-8 text-right">' + item.qty + '</span></div>';
      });
      html += '</div></div>';
    }

    html += '</div>';
    document.getElementById('mainContent').innerHTML = html;

    setTimeout(function() {
      if (_charts.monthly) _charts.monthly.destroy();
      var ctxM = document.getElementById('chartMonthly');
      if (ctxM) {
        _charts.monthly = new Chart(ctxM, {
          type:'bar',
          data:{
            labels: d.monthly.map(function(m){ return m.label; }),
            datasets:[
              { label:'รับเข้า', data:d.monthly.map(function(m){ return m.receive; }), backgroundColor:'#3b82f6', borderRadius:6, barPercentage:0.6 },
              { label:'เบิกออก', data:d.monthly.map(function(m){ return m.withdraw; }), backgroundColor:'#8b5cf6', borderRadius:6, barPercentage:0.6 }
            ]
          },
          options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'top',labels:{font:{family:'Sarabun',size:11},boxWidth:12}}}, scales:{y:{ticks:{font:{family:'Sarabun',size:11}},grid:{color:'#f3f4f6'}},x:{ticks:{font:{family:'Sarabun',size:11}},grid:{display:false}}} }
        });
      }
      if (_charts.category) _charts.category.destroy();
      var ctxC = document.getElementById('chartCategory');
      if (ctxC && d.category_stock) {
        var cats = Object.keys(d.category_stock);
        var vals = cats.map(function(k){ return d.category_stock[k]; });
        var colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899'];
        _charts.category = new Chart(ctxC, {
          type:'doughnut',
          data:{ labels:cats, datasets:[{ data:vals, backgroundColor:colors.slice(0,cats.length), borderWidth:0, hoverOffset:6 }] },
          options:{ responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{ legend:{position:'bottom',labels:{font:{family:'Sarabun',size:10},boxWidth:10,padding:8}} } }
        });
      }
    }, 100);

  }).catch(function(err) { hideLoading(); showError('โหลด Dashboard ไม่สำเร็จ'); });
}

function quickApprove(wdId, qty) {
  showConfirm('อนุมัติการเบิก', 'ยืนยันอนุมัติ ' + qty + ' รายการ?', function() {
    showLoading('กำลังอนุมัติ...');
    callAPI('approveWithdrawal', AUTH.token, wdId, qty).then(function(res) {
      hideLoading();
      if (res.success) { showSuccess('อนุมัติสำเร็จ'); renderDashboard(); }
      else showError(res.message);
    }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
  }, 'อนุมัติ');
}

function quickReject(wdId) {
  Swal.fire({
    title:'เหตุผลที่ปฏิเสธ', input:'text', inputPlaceholder:'ระบุเหตุผล...',
    showCancelButton:true, confirmButtonText:'ปฏิเสธ', cancelButtonText:'ยกเลิก',
    inputValidator:function(v){ if(!v) return 'กรุณาระบุเหตุผล'; },
    customClass:{popup:'swal2-popup'}
  }).then(function(r) {
    if (!r.isConfirmed) return;
    showLoading('กำลังดำเนินการ...');
    callAPI('rejectWithdrawal', AUTH.token, wdId, r.value).then(function(res) {
      hideLoading();
      if (res.success) { showSuccess('ปฏิเสธคำขอแล้ว'); renderDashboard(); }
      else showError(res.message);
    }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
  });
}

// ===== ITEMS =====
var _itemsData = [];
var _itemsPage = 1;
var _itemsFilter = { search:'', category:'all', stock:'all' };
var _itemImageFileId = null;
var _itemsCacheTime = 0;
var ITEMS_CACHE_TTL = 30000; // 30 วินาที

function renderItems() {
  if (AUTH.user.role !== 'admin') { loadPage('stock'); return; }
  showLoading('โหลดรายการวัสดุ...');
  // reuse cache ถ้ายังไม่หมดอายุ
  if (_itemsData.length > 0 && (Date.now() - _itemsCacheTime) < ITEMS_CACHE_TTL) {
    hideLoading();
    _itemsPage = 1;
    buildItemsPage();
    return;
  }
  callAPI('getItems', AUTH.token).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    _itemsData = res.data;
    _itemsCacheTime = Date.now();
    _itemsPage  = 1;
    buildItemsPage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildItemsPage() {
  var filtered = filterItems(_itemsData, _itemsFilter);
  var paged    = paginate(filtered, _itemsPage);
  var cats     = getCategoryList(_itemsData);

  var html = '<div class="fade-in space-y-4">';
  html += '<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">';
  html += '<div class="flex gap-2 flex-wrap">';
  html += '<div class="relative"><i class="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>';
  html += '<input type="text" id="itemSearch" placeholder="ค้นหาวัสดุ..." value="' + escHtml(_itemsFilter.search) + '"';
  html += ' onkeyup="debounceItemFilter()" class="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 w-48"></div>';
  html += '<select id="itemCatFilter" onchange="applyItemFilter()" class="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500">';
  html += '<option value="all">ทุกหมวดหมู่</option>';
  cats.forEach(function(c){ html += '<option value="' + escHtml(c) + '" ' + (_itemsFilter.category===c?'selected':'') + '>' + escHtml(c) + '</option>'; });
  html += '</select>';
  html += '<select id="itemStockFilter" onchange="applyItemFilter()" class="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500">';
  html += '<option value="all">สต็อกทั้งหมด</option><option value="low" ' + (_itemsFilter.stock==='low'?'selected':'') + '>ใกล้หมด</option><option value="ok" ' + (_itemsFilter.stock==='ok'?'selected':'') + '>ปกติ</option>';
  html += '</select></div>';
  html += '<button onclick="openAddItemModal()" class="btn-primary flex items-center gap-2 whitespace-nowrap">';
  html += '<i class="fi fi-rr-plus"></i> เพิ่มวัสดุใหม่</button></div>';

  html += '<div class="flex gap-2 flex-wrap text-xs">';
  html += '<span class="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium"><i class="fi fi-rr-box-open-full mr-1"></i>ทั้งหมด: ' + _itemsData.length + '</span>';
  var lowCount = _itemsData.filter(function(i){ return i.current_stock <= i.min_stock; }).length;
  if (lowCount > 0) html += '<span class="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full font-medium"><i class="fi fi-rr-triangle-warning mr-1"></i>ใกล้หมด: ' + lowCount + '</span>';
  html += '</div>';

  html += '<div class="card overflow-hidden">';
  html += '<div class="hidden md:block overflow-x-auto">';
  html += '<table class="w-full text-sm"><thead class="bg-gray-50 text-gray-600 text-xs">';
  html += '<tr><th class="px-4 py-3 text-left w-10">#</th><th class="px-4 py-3 text-left w-14">รูป</th><th class="px-4 py-3 text-left">รหัส</th><th class="px-4 py-3 text-left">ชื่อวัสดุ</th><th class="px-4 py-3 text-left">ขนาด</th><th class="px-4 py-3 text-left">หน่วย</th><th class="px-4 py-3 text-left">หมวดหมู่</th><th class="px-4 py-3 text-center">สต็อก</th><th class="px-4 py-3 text-center">ขั้นต่ำ</th><th class="px-4 py-3 text-center">สถานะ</th><th class="px-4 py-3 text-center">จัดการ</th></tr></thead>';
  html += '<tbody class="divide-y divide-gray-100">';
  if (paged.length === 0) {
    html += '<tr><td colspan="11" class="text-center py-10 text-gray-400">ไม่พบรายการ</td></tr>';
  }
  paged.forEach(function(item, idx) {
    var sClass = getStockClass(item.current_stock, item.min_stock);
    var sLabel = getStockLabel(item.current_stock, item.min_stock);
    var imgUrlSrc = imgUrl(item.image_file_id);
    var imgHtml = imgUrlSrc ? '<img src="' + imgUrlSrc + '" class="w-10 h-10 object-cover rounded-lg border border-gray-200">' : '<div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><i class="fi fi-rr-box-open-full text-sm"></i></div>';
    html += '<tr>';
    html += '<td class="px-4 py-3 text-gray-400 text-xs">' + ((_itemsPage-1)*ITEMS_PER_PAGE + idx + 1) + '</td>';
    html += '<td class="px-4 py-3">' + imgHtml + '</td>';
    html += '<td class="px-4 py-3 font-mono text-xs text-navy-700">' + escHtml(item.item_code) + '</td>';
    html += '<td class="px-4 py-3 font-medium text-gray-800">' + escHtml(item.name) + '</td>';
    html += '<td class="px-4 py-3 text-gray-500 text-xs">' + escHtml(item.size||'-') + '</td>';
    html += '<td class="px-4 py-3 text-gray-600 text-xs">' + escHtml(item.unit) + '</td>';
    html += '<td class="px-4 py-3 text-xs text-gray-500">' + escHtml(item.category||'-') + '</td>';
    html += '<td class="px-4 py-3 text-center font-bold text-gray-800">' + item.current_stock + '</td>';
    html += '<td class="px-4 py-3 text-center text-gray-500 text-xs">' + item.min_stock + '</td>';
    html += '<td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded-full text-xs font-medium ' + sClass + '">' + sLabel + '</span></td>';
    html += '<td class="px-4 py-3 text-center"><div class="flex items-center justify-center gap-1">';
    html += '<button title="ดูรายละเอียด" onclick="showItemDetailModal(\'' + item.id + '\')" class="w-7 h-7 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-200"><i class="fi fi-rr-eye text-xs"></i></button>';
    html += '<button title="QR Code" onclick="showQRModal(\'' + item.id + '\')" class="w-7 h-7 bg-teal-100 text-teal-700 rounded-lg flex items-center justify-center hover:bg-teal-200"><i class="fi fi-rr-qr-scan text-xs"></i></button>';
    html += '<button title="แก้ไข" onclick="openEditItemModal(\'' + item.id + '\')" class="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center hover:bg-blue-200"><i class="fi fi-rr-edit text-xs"></i></button>';
    html += '<button title="ลบ" onclick="deleteItemConfirm(\'' + item.id + '\',\'' + escHtml(item.name) + '\')" class="w-7 h-7 bg-red-100 text-red-700 rounded-lg flex items-center justify-center hover:bg-red-200"><i class="fi fi-rr-trash text-xs"></i></button>';
    html += '</div></td></tr>';
  });
  html += '</tbody></table></div>';

  html += '<div class="md:hidden divide-y divide-gray-100">';
  if (paged.length === 0) html += '<p class="text-center text-sm text-gray-400 py-8">ไม่พบรายการ</p>';
  paged.forEach(function(item) {
    var sClass = getStockClass(item.current_stock, item.min_stock);
    var sLabel = getStockLabel(item.current_stock, item.min_stock);
    var imgUrlSrc = imgUrl(item.image_file_id);
    var imgHtml = imgUrlSrc ? '<img src="' + imgUrlSrc + '" class="w-12 h-12 object-cover rounded-xl border border-gray-200 flex-shrink-0">' : '<div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0"><i class="fi fi-rr-box-open-full text-gray-400 text-lg"></i></div>';
    html += '<div class="p-4"><div class="flex items-start justify-between gap-3">';
    html += '<div class="flex items-center gap-3 flex-1 min-w-0">' + imgHtml + '<div class="min-w-0"><p class="font-semibold text-gray-800 text-sm">' + escHtml(item.name) + '</p>';
    html += '<p class="text-xs text-gray-500 mt-0.5">' + escHtml(item.item_code) + ' • ' + escHtml(item.size||'') + ' • ' + escHtml(item.unit) + '</p>';
    html += '<div class="flex items-center gap-2 mt-2">';
    html += '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + sClass + '">' + sLabel + '</span>';
    html += '<span class="text-xs text-gray-600">สต็อก: <b>' + item.current_stock + '</b> ' + item.unit + '</span></div></div>';
    html += '<div class="flex gap-1">';
    html += '<button onclick="showItemDetailModal(\'' + item.id + '\')" class="w-8 h-8 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center hover:bg-gray-200" title="ดูรายละเอียด"><i class="fi fi-rr-eye text-sm"></i></button>';
    html += '<button onclick="showQRModal(\'' + item.id + '\')" class="w-8 h-8 bg-teal-100 text-teal-700 rounded-xl flex items-center justify-center"><i class="fi fi-rr-qr-scan text-sm"></i></button>';
    html += '<button onclick="openEditItemModal(\'' + item.id + '\')" class="w-8 h-8 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center"><i class="fi fi-rr-edit text-sm"></i></button>';
    html += '</div></div></div>';
  });
  html += '</div></div>';

  html += '<div id="itemsPagination"></div>';
  html += '</div>';
  document.getElementById('mainContent').innerHTML = html;
  renderPagination('itemsPagination', filtered.length, _itemsPage, function(p) { _itemsPage = p; buildItemsPage(); });
}

function filterItems(data, f) {
  return data.filter(function(i) {
    if (f.search && !i.name.toLowerCase().includes(f.search.toLowerCase()) && !(i.item_code||'').toLowerCase().includes(f.search.toLowerCase())) return false;
    if (f.category !== 'all' && i.category !== f.category) return false;
    if (f.stock === 'low' && i.current_stock > i.min_stock) return false;
    if (f.stock === 'ok'  && i.current_stock <= i.min_stock) return false;
    return true;
  });
}
function getCategoryList(data) {
  var cats = {};
  data.forEach(function(i){ if(i.category) cats[i.category]=1; });
  return Object.keys(cats).sort();
}
function paginate(data, page) {
  return data.slice((page-1)*ITEMS_PER_PAGE, page*ITEMS_PER_PAGE);
}

var _filterTimer;
function debounceItemFilter() { clearTimeout(_filterTimer); _filterTimer = setTimeout(applyItemFilter, 400); }
function applyItemFilter() {
  _itemsFilter.search   = (document.getElementById('itemSearch') || {}).value || '';
  _itemsFilter.category = (document.getElementById('itemCatFilter') || {}).value || 'all';
  _itemsFilter.stock    = (document.getElementById('itemStockFilter') || {}).value || 'all';
  _itemsPage = 1;
  buildItemsPage();
}

function openAddItemModal() {
  _itemImageFileId = null;
  var body = itemFormHTML({});
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="submitAddItem()" class="btn-primary"><i class="fi fi-rr-plus mr-1"></i>เพิ่มวัสดุ</button>';
  openModal('เพิ่มรายการวัสดุใหม่', body, footer);
}
function openEditItemModal(id) {
  var item = _itemsData.find(function(i){ return i.id === id; });
  if (!item) return;
  _itemImageFileId = item.image_file_id || null;
  var body = itemFormHTML(item);
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="submitEditItem(\'' + id + '\')" class="btn-primary"><i class="fi fi-rr-disk mr-1"></i>บันทึก</button>';
  openModal('แก้ไขรายการวัสดุ', body, footer);
}
function itemFormHTML(item) {
  var fid = _itemImageFileId || item.image_file_id || '';
  var imgSection = '';
  if (fid) {
    var imgSrc = imgUrl(fid);
    imgSection = '<div class="sm:col-span-2"><label class="form-label">รูปภาพวัสดุ</label><div class="flex items-center gap-3"><img id="itemImgPreview" src="' + (imgSrc||'') + '" class="w-24 h-24 object-cover rounded-xl border border-gray-200"><button onclick="removeItemImage()" type="button" class="text-red-500 text-sm hover:underline">ลบรูป</button></div><input type="hidden" id="itemImageFileId" value="' + fid + '"></div>';
  } else {
    imgSection = '<div class="sm:col-span-2"><label class="form-label">รูปภาพวัสดุ</label><input type="file" id="itemImageFile" accept="image/*" onchange="handleItemImageUpload(this)" class="form-input py-1.5"><p class="text-xs text-gray-400 mt-1">รองรับ JPG, PNG (สูงสุด 5MB)</p><div id="itemImagePreview"></div></div>';
  }
  return '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">'
    + fieldHTML('ชื่อวัสดุ *', 'itemName', 'text', item.name||'', 'sm:col-span-2')
    + fieldHTML('ขนาดบรรจุ', 'itemSize', 'text', item.size||'')
    + fieldHTML('หน่วย *', 'itemUnit', 'text', item.unit||'')
    + fieldHTML('หมวดหมู่', 'itemCategory', 'text', item.category||'วัสดุทำความสะอาด')
    + fieldHTML('สต็อกเริ่มต้น', 'itemStock', 'number', item.current_stock||0)
    + fieldHTML('สต็อกขั้นต่ำ', 'itemMinStock', 'number', item.min_stock||5)
    + imgSection
    + '</div>';
}
function fieldHTML(label, id, type, value, extra) {
  return '<div class="' + (extra||'') + '">'
    + '<label class="form-label">' + escHtml(label) + '</label>'
    + '<input type="' + type + '" id="' + id + '" value="' + escHtml(String(value)) + '" class="form-input"></div>';
}

function submitAddItem() {
  var data = readItemForm();
  if (!data) return;
  showLoading('กำลังบันทึก...');
  callAPI('addItem', AUTH.token, data).then(function(res) {
    hideLoading(); closeModal();
    if (res.success) { showSuccess(res.message); renderItems(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}
function submitEditItem(id) {
  var data = readItemForm();
  if (!data) return;
  showLoading('กำลังบันทึก...');
  callAPI('updateItem', AUTH.token, id, data).then(function(res) {
    hideLoading(); closeModal();
    if (res.success) { showSuccess(res.message); renderItems(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}
function readItemForm() {
  var name = (document.getElementById('itemName')||{}).value||'';
  var unit = (document.getElementById('itemUnit')||{}).value||'';
  if (!name.trim()) { showError('กรุณากรอกชื่อวัสดุ'); return null; }
  if (!unit.trim()) { showError('กรุณากรอกหน่วย'); return null; }
  return {
    name: name, size: (document.getElementById('itemSize')||{}).value||'',
    unit: unit, category: (document.getElementById('itemCategory')||{}).value||'',
    current_stock: parseInt((document.getElementById('itemStock')||{}).value)||0,
    min_stock: parseInt((document.getElementById('itemMinStock')||{}).value)||5,
    image_file_id: (document.getElementById('itemImageFileId')||{}).value||_itemImageFileId||''
  };
}
function handleItemImageUpload(input) {
  var file = input.files[0];
  if (!file) return;
  if (!file.type.match('image.*')) { showError('กรุณาเลือกไฟล์รูปภาพ'); input.value=''; return; }
  if (file.size > 5 * 1024 * 1024) { showError('ไฟล์ใหญ่เกิน 5MB'); input.value=''; return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var base64 = e.target.result.split(',')[1];
    showLoading('กำลังอัปโหลดรูป...');
    callAPI('uploadFile', AUTH.token, base64, file.type, file.name).then(function(res) {
      hideLoading();
      if (res.success) {
        _itemImageFileId = res.file_id;
        var preview = document.getElementById('itemImagePreview');
        var imgSrc = imgUrl(res.file_id);
        if (preview) preview.innerHTML = '<img src="' + (imgSrc||'') + '" class="w-24 h-24 object-cover rounded-xl border border-gray-200 mt-2">';
        showSuccess('อัปโหลดรูปเรียบร้อย');
      } else {
        showError(res.message || 'อัปโหลดไม่สำเร็จ');
      }
    }).catch(function() { hideLoading(); showError('อัปโหลดไม่สำเร็จ'); });
  };
  reader.readAsDataURL(file);
}
function removeItemImage() {
  _itemImageFileId = null;
  var name = (document.getElementById('itemName')||{}).value||'';
  var size = (document.getElementById('itemSize')||{}).value||'';
  var unit = (document.getElementById('itemUnit')||{}).value||'';
  var cat  = (document.getElementById('itemCategory')||{}).value||'';
  var stock = (document.getElementById('itemStock')||{}).value||0;
  var min   = (document.getElementById('itemMinStock')||{}).value||5;
  var fakeItem = {name:name, size:size, unit:unit, category:cat, current_stock:stock, min_stock:min, image_file_id:''};
  var body = itemFormHTML(fakeItem);
  document.getElementById('modalBody').innerHTML = body;
}

function deleteItemConfirm(id, name) {
  showConfirm('ลบรายการวัสดุ', 'ต้องการลบ "' + name + '" ใช่หรือไม่?', function() {
    showLoading('กำลังลบ...');
    callAPI('deleteItem', AUTH.token, id).then(function(res) {
      hideLoading();
      if (res.success) { showSuccess(res.message); renderItems(); }
      else showError(res.message);
    }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
  }, 'ลบ');
}

function showItemDetailModal(itemId) {
  var item = _itemsData.find(function(i){ return i.id === itemId; });
  if (!item) return;
  var sClass = getStockClass(item.current_stock, item.min_stock);
  var sLabel = getStockLabel(item.current_stock, item.min_stock);
  var pct = item.min_stock > 0 ? Math.min(100, Math.round(item.current_stock / (item.min_stock * 3) * 100)) : 50;
  var barColor = item.current_stock <= 0 ? 'bg-red-500' : item.current_stock <= item.min_stock ? 'bg-amber-400' : 'bg-green-500';

  var imgUrlSrc = imgUrl(item.image_file_id);
  var imgSection = '';
  if (imgUrlSrc) {
    imgSection = '<div class="flex justify-center mb-4"><img src="' + imgUrlSrc + '" class="w-40 h-40 object-cover rounded-2xl border border-gray-200 shadow-sm"></div>';
  } else {
    imgSection = '<div class="flex justify-center mb-4"><div class="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center"><i class="fi fi-rr-box-open-full text-gray-300 text-4xl"></i></div></div>';
  }

  var body = '<div class="text-center mb-5">'
    + imgSection
    + '<p class="font-mono text-xs text-navy-600 mb-1">' + escHtml(item.item_code) + '</p>'
    + '<h2 class="text-lg font-bold text-gray-800">' + escHtml(item.name) + '</h2>'
    + (item.size ? '<p class="text-sm text-gray-500 mt-1">' + escHtml(item.size) + '</p>' : '')
    + '</div>';

  body += '<div class="space-y-3">';
  body += '<div class="grid grid-cols-2 gap-3">'
    + '<div class="bg-gray-50 rounded-xl p-3 text-center"><p class="text-xs text-gray-400 mb-1">หมวดหมู่</p><p class="text-sm font-semibold text-gray-700">' + escHtml(item.category || '-') + '</p></div>'
    + '<div class="bg-gray-50 rounded-xl p-3 text-center"><p class="text-xs text-gray-400 mb-1">หน่วย</p><p class="text-sm font-semibold text-gray-700">' + escHtml(item.unit) + '</p></div>'
    + '</div>';

  body += '<div class="bg-white border border-gray-200 rounded-xl p-4">'
    + '<div class="flex items-center justify-between mb-2">'
    + '<span class="text-sm text-gray-500">คงเหลือในระบบ</span>'
    + '<span class="text-xl font-bold text-gray-800">' + item.current_stock + ' <span class="text-sm font-normal text-gray-500">' + item.unit + '</span></span>'
    + '</div>'
    + '<div class="progress-bar mb-2"><div class="progress-fill ' + barColor + '" style="width:' + pct + '%"></div></div>'
    + '<div class="flex items-center justify-between">'
    + '<span class="text-xs text-gray-400">ขั้นต่ำ: ' + item.min_stock + ' ' + item.unit + '</span>'
    + '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + sClass + '">' + sLabel + '</span>'
    + '</div></div>';

  if (item.description) {
    body += '<div class="bg-gray-50 rounded-xl p-3"><p class="text-xs text-gray-400 mb-1">หมายเหตุ / รายละเอียด</p><p class="text-sm text-gray-700">' + escHtml(item.description) + '</p></div>';
  }

  if (item.created_at || item.updated_at) {
    body += '<div class="text-xs text-gray-400 text-center pt-1">'
      + (item.created_at ? '<span>เพิ่มเมื่อ: ' + formatDate(item.created_at) + '</span>' : '')
      + (item.updated_at ? ' <span class="mx-1">|</span> <span>อัปเดตล่าสุด: ' + formatDate(item.updated_at) + '</span>' : '')
      + '</div>';
  }

  body += '</div>';

  var footer = '<button onclick="closeModal()" class="btn-secondary">ปิด</button>'
    + '<button onclick="openWithdrawModal(\'' + item.id + '\')" class="btn-primary"><i class="fi fi-rr-inbox-out mr-1"></i>เบิกวัสดุ</button>';
  openModal('รายละเอียดวัสดุ', body, footer);
}

// ===== QR CODE =====
function showQRModal(itemId) {
  var item = _itemsData.find(function(i){ return i.id === itemId; });
  if (!item) return;
  var baseUrl = window.location.origin + window.location.pathname;
  var qrUrl  = baseUrl + '?action=withdraw&item_id=' + itemId;
  var body = '<div class="text-center">'
    + '<p class="font-semibold text-gray-700 mb-1">' + escHtml(item.name) + '</p>'
    + '<p class="text-xs text-gray-500 mb-4">' + escHtml(item.item_code) + ' • ' + escHtml(item.size||'') + ' • ' + item.unit + '</p>'
    + '<div id="qrCanvas" class="flex justify-center mb-4"></div>'
    + '<p class="text-xs text-gray-400 break-all border rounded-lg px-3 py-2 bg-gray-50">' + escHtml(qrUrl) + '</p>'
    + '<p class="text-xs text-gray-400 mt-3">พนักงานสแกน QR นี้ด้วยกล้องมือถือเพื่อเบิกวัสดุ</p></div>';
  var footer = '<button onclick="closeModal()" class="btn-secondary">ปิด</button>'
    + '<button onclick="printQRLabel(\'' + escHtml(JSON.stringify(item).replace(/'/g,'&#39;')) + '\')" class="btn-primary"><i class="fi fi-rr-print mr-1"></i>พิมพ์</button>';
  openModal('QR Code — ' + item.name, body, footer);
  setTimeout(function() {
    new QRCode(document.getElementById('qrCanvas'), {
      text: qrUrl, width:180, height:180,
      colorDark:'#1a2566', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M
    });
  }, 100);
}

function printQRLabel(itemJson) {
  var item = JSON.parse(itemJson);
  var baseUrl = window.location.origin + window.location.pathname;
  var qrUrl  = baseUrl + '?action=withdraw&item_id=' + item.id;
  var win = window.open('', '_blank');
  win.document.write('<html><head><title>QR — ' + item.name + '</title>'
    + '<style>body{font-family:sans-serif;text-align:center;padding:20px}h3{margin:0 0 4px}p{margin:2px 0;font-size:12px;color:#555}</style></head>'
    + '<body><h3>' + item.name + '</h3><p>' + item.item_code + ' | ' + (item.size||'') + ' | ' + item.unit + '</p>'
    + '<div id="qr" style="display:inline-block;margin:12px 0"></div>'
    + '<p style="font-size:10px;word-break:break-all;color:#888">' + qrUrl + '</p>'
    + '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'
    + '<script>new QRCode(document.getElementById("qr"),{text:"' + qrUrl + '",width:200,height:200,colorDark:"#1a2566"});'
    + 'setTimeout(function(){window.print();window.close();},600);<\/script>'
    + '</body></html>');
  win.document.close();
}

// ===== STOCK =====
var _stockData = [];
var _stockView = 'card';

function renderStock() {
  showLoading('โหลดสต็อก...');
  // reuse cache ถ้ายังไม่หมดอายุ
  if (_itemsData.length > 0 && (Date.now() - _itemsCacheTime) < ITEMS_CACHE_TTL) {
    hideLoading();
    _stockData = _itemsData;
    buildStockPage();
    return;
  }
  callAPI('getItems', AUTH.token).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    _itemsData = res.data;
    _itemsCacheTime = Date.now();
    _stockData = res.data;
    buildStockPage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildStockPage() {
  var html = '<div class="fade-in space-y-4">';
  html += '<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">';
  html += '<div class="flex gap-2 flex-wrap">';
  html += '<div class="relative"><i class="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>'
    + '<input type="text" id="stockSearch" placeholder="ค้นหา..." onkeyup="filterStock()" class="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 w-44"></div>';
  html += '<select id="stockCatFilter" onchange="filterStock()" class="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none">';
  html += '<option value="">ทุกหมวด</option>';
  getCategoryList(_stockData).forEach(function(c){ html += '<option>' + escHtml(c) + '</option>'; });
  html += '</select></div>';
  html += '<div class="flex gap-2">';
  html += '<button onclick="setStockView(\'card\')" id="btnCardView" class="px-3 py-2 border rounded-xl text-sm ' + (_stockView==='card'?'bg-navy-700 text-white border-navy-700':'border-gray-300 text-gray-600 hover:bg-gray-50') + '"><i class="fi fi-rr-grid"></i></button>';
  html += '<button onclick="setStockView(\'table\')" id="btnTableView" class="px-3 py-2 border rounded-xl text-sm ' + (_stockView==='table'?'bg-navy-700 text-white border-navy-700':'border-gray-300 text-gray-600 hover:bg-gray-50') + '"><i class="fi fi-rr-list"></i></button>';
  html += '</div></div>';

  html += '<div id="stockContent">' + buildStockContent(_stockData) + '</div>';
  html += '</div>';
  document.getElementById('mainContent').innerHTML = html;
}

function buildStockContent(data) {
  if (_stockView === 'card') {
    var html = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">';
    if (data.length === 0) html += '<p class="col-span-4 text-center text-gray-400 py-10">ไม่พบรายการ</p>';
    data.forEach(function(item) {
      var sClass = getStockClass(item.current_stock, item.min_stock);
      var sLabel = getStockLabel(item.current_stock, item.min_stock);
      var pct = item.min_stock > 0 ? Math.min(100, Math.round(item.current_stock / (item.min_stock*3) * 100)) : 50;
      var barColor = item.current_stock <= 0 ? 'bg-red-500' : item.current_stock <= item.min_stock ? 'bg-amber-400' : 'bg-green-500';
      html += '<div class="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">';
      html += '<div class="flex items-start justify-between">';
      var imgUrlSrc = imgUrl(item.image_file_id);
      var cardImg = imgUrlSrc ? '<img src="' + imgUrlSrc + '" class="w-10 h-10 object-cover rounded-xl border border-gray-200">' : '<div class="w-10 h-10 bg-navy-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-box-open-full text-navy-700 text-lg"></i></div>';
      html += '<div>' + cardImg + '</div>';
      html += '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + sClass + '">' + sLabel + '</span></div>';
      html += '<div><p class="font-semibold text-gray-800 text-sm leading-snug">' + escHtml(item.name) + '</p>';
      html += '<p class="text-xs text-gray-400 mt-0.5">' + escHtml(item.size||'') + ' • ' + escHtml(item.category||'') + '</p></div>';
      html += '<div><div class="flex justify-between text-xs text-gray-500 mb-1"><span>คงเหลือ</span><span class="font-bold text-gray-800">' + item.current_stock + ' ' + item.unit + '</span></div>';
      html += '<div class="progress-bar"><div class="progress-fill ' + barColor + '" style="width:' + pct + '%"></div></div>';
      html += '<p class="text-xs text-gray-400 mt-1">ขั้นต่ำ: ' + item.min_stock + ' ' + item.unit + '</p></div>';
      html += '<div class="flex gap-2 pt-1">';
      html += '<button onclick="showItemDetailModal(\'' + item.id + '\')" class="flex-1 btn-secondary btn-sm text-xs" title="ดูรายละเอียด"><i class="fi fi-rr-eye mr-1"></i>ดู</button>';
      if (AUTH.user.role !== 'employee') {
        html += '<button onclick="openReceiveModal(\'' + item.id + '\')" class="flex-1 btn-success btn-sm text-xs"><i class="fi fi-rr-inbox-in mr-1"></i>รับเข้า</button>';
      }
      html += '<button onclick="openWithdrawModal(\'' + item.id + '\')" class="flex-1 btn-primary btn-sm text-xs"><i class="fi fi-rr-inbox-out mr-1"></i>เบิก</button>';
      html += '</div></div>';
    });
    return html + '</div>';
  } else {
    var html = '<div class="card overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
    html += '<tr><th class="px-4 py-3 text-left">รหัส</th><th class="px-4 py-3 text-left">ชื่อวัสดุ</th><th class="px-4 py-3 text-left">หน่วย</th>';
    html += '<th class="px-4 py-3 text-center">สต็อก</th><th class="px-4 py-3 text-center">ขั้นต่ำ</th><th class="px-4 py-3 text-center">สถานะ</th><th class="px-4 py-3 text-center">การดำเนินการ</th></tr>';
    html += '</thead><tbody class="divide-y divide-gray-100">';
    if (data.length === 0) html += '<tr><td colspan="7" class="text-center py-8 text-gray-400">ไม่พบรายการ</td></tr>';
    data.forEach(function(item) {
      var sClass = getStockClass(item.current_stock, item.min_stock);
      html += '<tr><td class="px-4 py-2.5 font-mono text-xs text-navy-700">' + escHtml(item.item_code) + '</td>';
      html += '<td class="px-4 py-2.5 font-medium text-gray-700">' + escHtml(item.name) + '</td>';
      html += '<td class="px-4 py-2.5 text-xs text-gray-500">' + escHtml(item.unit) + '</td>';
      html += '<td class="px-4 py-2.5 text-center font-bold">' + item.current_stock + '</td>';
      html += '<td class="px-4 py-2.5 text-center text-gray-400">' + item.min_stock + '</td>';
      html += '<td class="px-4 py-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-xs ' + sClass + '">' + getStockLabel(item.current_stock, item.min_stock) + '</span></td>';
      html += '<td class="px-4 py-2.5 text-center"><div class="flex gap-1 justify-center">';
      html += '<button onclick="showItemDetailModal(\'' + item.id + '\')" class="btn-secondary btn-sm text-xs" title="ดูรายละเอียด"><i class="fi fi-rr-eye"></i></button>';
      if (AUTH.user.role !== 'employee') html += '<button onclick="openReceiveModal(\'' + item.id + '\')" class="btn-success btn-sm text-xs"><i class="fi fi-rr-inbox-in mr-1"></i>รับเข้า</button>';
      html += '<button onclick="openWithdrawModal(\'' + item.id + '\')" class="btn-primary btn-sm text-xs"><i class="fi fi-rr-inbox-out mr-1"></i>เบิก</button>';
      html += '</div></td></tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
  }
}

function setStockView(view) {
  _stockView = view;
  buildStockPage();
}
function filterStock() {
  var q   = (document.getElementById('stockSearch')||{}).value||'';
  var cat = (document.getElementById('stockCatFilter')||{}).value||'';
  var filtered = _stockData.filter(function(i) {
    if (q && !i.name.toLowerCase().includes(q.toLowerCase()) && !(i.item_code||'').toLowerCase().includes(q.toLowerCase())) return false;
    if (cat && i.category !== cat) return false;
    return true;
  });
  document.getElementById('stockContent').innerHTML = buildStockContent(filtered);
}

// ===== RECEIVE =====
var _receiveData = [];
var _receivePage = 1;

function renderReceive() {
  showLoading('โหลดข้อมูลรับเข้า...');
  var itemsPromise = (_itemsData.length > 0 && (Date.now() - _itemsCacheTime) < ITEMS_CACHE_TTL)
    ? Promise.resolve({ success: true, data: _itemsData })
    : callAPI('getItems', AUTH.token).then(function(res){ _itemsData = res.data||[]; _itemsCacheTime = Date.now(); return res; });
  Promise.all([ itemsPromise, callAPI('getReceives', AUTH.token, {}) ]).then(function(results) {
    hideLoading();
    _itemsData   = results[0].data || [];
    _receiveData = results[1].data || [];
    _receivePage = 1;
    buildReceivePage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildReceivePage() {
  var paged = paginate(_receiveData, _receivePage);
  var html = '<div class="fade-in space-y-4">';
  html += '<div class="flex items-center justify-between">';
  html += '<h3 class="font-semibold text-gray-700">ประวัติรับวัสดุเข้าคลัง</h3>';
  html += '<button onclick="openReceiveModal(null)" class="btn-primary flex items-center gap-2"><i class="fi fi-rr-plus"></i> บันทึกรับเข้า</button></div>';

  html += '<div class="card overflow-hidden"><div class="overflow-x-auto">';
  html += '<table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
  html += '<tr><th class="px-4 py-3 text-left">เลขที่รับ</th><th class="px-4 py-3 text-left">วันที่</th>';
  html += '<th class="px-4 py-3 text-left">รายการ</th><th class="px-4 py-3 text-center">จำนวน</th>';
  html += '<th class="px-4 py-3 text-left">ผู้รับ</th><th class="px-4 py-3 text-left">หมายเหตุ</th></tr></thead>';
  html += '<tbody class="divide-y divide-gray-100">';
  if (paged.length === 0) html += '<tr><td colspan="6" class="text-center py-10 text-gray-400">ยังไม่มีรายการรับเข้า</td></tr>';
  paged.forEach(function(r) {
    html += '<tr><td class="px-4 py-2.5 font-mono text-xs text-navy-700">' + escHtml(r.receive_no) + '</td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-600">' + formatDate(r.date) + '</td>';
    html += '<td class="px-4 py-2.5 font-medium text-gray-700">' + escHtml(r.item_name||'-') + '</td>';
    html += '<td class="px-4 py-2.5 text-center font-bold text-blue-700">+' + r.quantity + ' ' + escHtml(r.unit||'') + '</td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-500">' + escHtml(r.received_by_name||'-') + '</td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-400">' + escHtml(r.note||'-') + '</td></tr>';
  });
  html += '</tbody></table></div></div>';
  html += '<div id="receivePagination"></div></div>';
  document.getElementById('mainContent').innerHTML = html;
  renderPagination('receivePagination', _receiveData.length, _receivePage, function(p){ _receivePage=p; buildReceivePage(); });
}

function openReceiveModal(itemId) {
  var body = '<div class="space-y-4">';
  if (!itemId) {
    body += '<div><label class="form-label">เลือกวัสดุ *</label><select id="recItemId" class="form-input">';
    _itemsData.forEach(function(i){ body += '<option value="' + i.id + '">' + escHtml(i.name) + ' (คงเหลือ ' + i.current_stock + ' ' + i.unit + ')</option>'; });
    body += '</select></div>';
  } else {
    var item = _itemsData.find(function(i){ return i.id === itemId; });
    body += '<input type="hidden" id="recItemId" value="' + itemId + '">';
    body += '<p class="text-sm text-gray-600">รายการ: <b>' + escHtml(item.name) + '</b> (คงเหลือ ' + item.current_stock + ' ' + item.unit + ')</p>';
  }
  body += fieldHTML('จำนวนที่รับ *', 'recQty', 'number', 1);
  body += fieldHTML('วันที่', 'recDate', 'date', new Date().toISOString().split('T')[0]);
  body += '<div class="sm:col-span-2"><label class="form-label">หมายเหตุ</label><textarea id="recNote" class="form-input" rows="2"></textarea></div>';
  body += '</div>';
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="submitReceive()" class="btn-success"><i class="fi fi-rr-inbox-in mr-1"></i>บันทึกรับเข้า</button>';
  openModal('รับวัสดุเข้าคลัง', body, footer);
}

function submitReceive() {
  var itemId = (document.getElementById('recItemId')||{}).value||'';
  var qty    = parseInt((document.getElementById('recQty')||{}).value||0);
  var date   = (document.getElementById('recDate')||{}).value||'';
  var note   = (document.getElementById('recNote')||{}).value||'';
  if (!itemId) { showError('กรุณาเลือกวัสดุ'); return; }
  if (!qty || qty <= 0) { showError('จำนวนไม่ถูกต้อง'); return; }
  showLoading('กำลังบันทึก...');
  callAPI('addReceive', AUTH.token, { item_id:itemId, quantity:qty, date:date, note:note }).then(function(res) {
    hideLoading(); closeModal();
    if (res.success) { showSuccess(res.message); renderReceive(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

// ===== WITHDRAW =====
var _wdData   = [];
var _wdPage   = 1;
var _wdFilter = 'all';

function renderWithdraw() {
  showLoading('โหลดข้อมูล...');
  var itemsPromise = (_itemsData.length > 0 && (Date.now() - _itemsCacheTime) < ITEMS_CACHE_TTL)
    ? Promise.resolve({ success: true, data: _itemsData })
    : callAPI('getItems', AUTH.token).then(function(res){ _itemsData = res.data||[]; _itemsCacheTime = Date.now(); return res; });
  Promise.all([ itemsPromise, callAPI('getWithdrawals', AUTH.token, { status:'all' }) ]).then(function(results) {
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
  html += '<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">';
  html += '<h3 class="font-semibold text-gray-700 flex items-center gap-2"><i class="fi fi-rr-inbox-out text-navy-600"></i> รายการคำขอเบิกวัสดุ</h3>';
  html += '<button onclick="openWithdrawSelectModal()" class="btn-primary flex items-center gap-2"><i class="fi fi-rr-plus"></i> ยื่นคำขอเบิก</button></div>';

  html += '<div class="flex gap-2 border-b">';
  ['all','pending','approved','rejected'].forEach(function(s) {
    var labels = { all:'ทั้งหมด', pending:'รออนุมัติ', approved:'อนุมัติแล้ว', rejected:'ปฏิเสธ' };
    var count  = s === 'all' ? _wdData.length : _wdData.filter(function(w){ return w.status===s; }).length;
    html += '<button onclick="setWdFilter(\'' + s + '\')" class="pb-2.5 px-3 text-sm font-medium border-b-2 transition '
      + (_wdFilter===s ? 'border-navy-700 text-navy-700' : 'border-transparent text-gray-500 hover:text-gray-700') + '">'
      + labels[s] + ' <span class="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">' + count + '</span></button>';
  });
  html += '</div>';

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
    var imgUrlSrc = imgUrl(i.image_file_id);
    var imgHtml = imgUrlSrc ? '<img src="' + imgUrlSrc + '" class="w-9 h-9 object-cover rounded-xl border border-gray-200 flex-shrink-0">' : '<div class="w-9 h-9 bg-navy-100 rounded-xl flex items-center justify-center flex-shrink-0"><i class="fi fi-rr-box-open-full text-navy-700 text-sm"></i></div>';
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

function openWithdrawModal(itemId) {
  var item = _itemsData.find(function(i){ return i.id === itemId; });
  if (!item) return;
  var body = '<div class="space-y-4">';
  body += '<input type="hidden" id="wdItemId" value="' + itemId + '">';
  body += '<input type="hidden" id="wdViaQr" value="false">';
  body += '<p class="text-sm text-gray-600">รายการ: <b>' + escHtml(item.name) + '</b> (คงเหลือ ' + item.current_stock + ' ' + item.unit + ')</p>';
  body += fieldHTML('จำนวนที่ต้องการเบิก *', 'wdQty', 'number', 1);
  body += '<div class="sm:col-span-2"><label class="form-label">วัตถุประสงค์ *</label><input type="text" id="wdPurpose" class="form-input" placeholder="ระบุวัตถุประสงค์..."></div>';
  body += '<div class="sm:col-span-2"><label class="form-label">หมายเหตุ</label><textarea id="wdNote" class="form-input" rows="2"></textarea></div>';
  body += '</div>';
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="submitWithdraw()" class="btn-primary"><i class="fi fi-rr-inbox-out mr-1"></i>ยื่นคำขอเบิก</button>';
  openModal('เบิกวัสดุ', body, footer);
}

function openWithdrawFromQR(itemId) {
  showLoading('โหลดข้อมูล...');
  function _build(item) {
    hideLoading();
    var img = imgUrl(item.image_file_id);
    var body = '<div class="space-y-4">';
    body += '<input type="hidden" id="wdItemId" value="' + itemId + '">';
    body += '<input type="hidden" id="wdViaQr" value="true">';
    if (img) body += '<div class="flex justify-center"><img src="' + img + '" class="w-24 h-24 object-cover rounded-xl border border-gray-200 shadow-sm"></div>';
    body += '<p class="text-sm text-gray-600 text-center">รายการ: <b>' + escHtml(item.name) + '</b> (คงเหลือ ' + item.current_stock + ' ' + item.unit + ')</p>';
    body += fieldHTML('จำนวนที่ต้องการเบิก *', 'wdQty', 'number', 1);
    body += '<div class="sm:col-span-2"><label class="form-label">วัตถุประสงค์ *</label><input type="text" id="wdPurpose" class="form-input" placeholder="ระบุวัตถุประสงค์..."></div>';
    body += '<div class="sm:col-span-2"><label class="form-label">หมายเหตุ</label><textarea id="wdNote" class="form-input" rows="2"></textarea></div>';
    body += '</div>';
    var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
      + '<button onclick="submitWithdraw()" class="btn-primary"><i class="fi fi-rr-inbox-out mr-1"></i>ยื่นคำขอเบิก</button>';
    openModal('เบิกวัสดุ (QR)', body, footer);
  }
  // reuse cache ถ้ามี
  if (_itemsData.length > 0 && (Date.now() - _itemsCacheTime) < ITEMS_CACHE_TTL) {
    var item = _itemsData.find(function(i){ return i.id == itemId; });
    if (!item) item = _itemsData.find(function(i){ return i.item_code === itemId; });
    if (item) { _build(item); return; }
  }
  callAPI('getItems', AUTH.token).then(function(res) {
    _itemsData = res.data || [];
    _itemsCacheTime = Date.now();
    var item = _itemsData.find(function(i){ return i.id == itemId; });
    if (!item) item = _itemsData.find(function(i){ return i.item_code === itemId; });
    if (!item) { hideLoading(); showError('ไม่พบรายการวัสดุจาก QR (ID: ' + itemId + ')'); return; }
    _build(item);
  }).catch(function(){ hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

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

// ===== APPROVE =====
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

// ===== TRANSACTIONS =====
var _txData   = [];
var _txPage   = 1;
var _txFilter = { type:'all', date_from:'', date_to:'' };

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

  var totalR = filtered.filter(function(t){ return t.type==='receive'; }).length;
  var totalW = filtered.filter(function(t){ return t.type==='withdraw'; }).length;
  html += '<div class="flex gap-2 text-xs">';
  html += '<span class="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full"><i class="fi fi-rr-inbox-in mr-1"></i>รับเข้า: ' + totalR + '</span>';
  html += '<span class="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full"><i class="fi fi-rr-inbox-out mr-1"></i>เบิกออก: ' + totalW + '</span>';
  html += '<span class="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">ทั้งหมด: ' + filtered.length + '</span></div>';

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

// ===== REPORTS =====
var _reportCharts = {};

function renderReports() {
  var now = new Date();
  var html = '<div class="fade-in space-y-4">';
  html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';

  html += '<div class="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">';
  html += '<div class="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-inbox-in text-blue-600 text-xl"></i></div>';
  html += '<div><p class="font-semibold text-gray-800">รายงานรับวัสดุเข้า</p><p class="text-xs text-gray-400 mt-0.5">ประวัติการรับวัสดุทั้งหมด</p></div>';
  html += '<button onclick="loadReceiveReport()" class="btn-primary btn-sm mt-auto"><i class="fi fi-rr-eye mr-1"></i>ดูรายงาน</button></div>';

  html += '<div class="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">';
  html += '<div class="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-inbox-out text-purple-600 text-xl"></i></div>';
  html += '<div><p class="font-semibold text-gray-800">รายงานเบิกวัสดุออก</p><p class="text-xs text-gray-400 mt-0.5">ประวัติการเบิกและอนุมัติ</p></div>';
  html += '<button onclick="loadWithdrawReport()" class="btn-primary btn-sm mt-auto"><i class="fi fi-rr-eye mr-1"></i>ดูรายงาน</button></div>';

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

  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-triangle-warning text-amber-500"></i> รายการวัสดุที่ต้องเติมสต็อก</h3>';
  html += '<button onclick="exportLowStock()" class="btn-warning btn-sm flex items-center gap-1"><i class="fi fi-rr-file-spreadsheet"></i> Export</button></div>';
  html += '<div class="card-body" id="lowStockReport"><div class="flex justify-center py-4"><div class="w-6 h-6 border-2 border-navy-600 border-t-transparent rounded-full animate-spin"></div></div></div></div>';

  html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">';
  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-chart-histogram text-navy-600"></i> ยอดเบิกรายเดือน (6 เดือนล่าสุด)</h3></div>';
  html += '<div class="card-body"><div style="position:relative;height:220px"><canvas id="rptChartMonthly"></canvas></div></div></div>';
  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-star text-amber-500"></i> Top 10 วัสดุที่เบิกมากสุด</h3></div>';
  html += '<div class="card-body" id="rptTopItems"><div class="flex justify-center py-4"><div class="w-6 h-6 border-2 border-navy-600 border-t-transparent rounded-full animate-spin"></div></div></div></div>';
  html += '</div>';

  html += '<div id="reportDataSection"></div></div>';
  document.getElementById('mainContent').innerHTML = html;

  Promise.all([
    callAPI('getDashboardStats', AUTH.token),
    callAPI('getItems', AUTH.token)
  ]).then(function(results) {
    var stats = results[0];
    var items = results[1].data || [];
    var lowItems = items.filter(function(i){ return i.current_stock <= (i.min_stock||5); });

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

function loadReceiveReport() {
  showLoading('โหลดรายงาน...');
  callAPI('getReceives', AUTH.token, {}).then(function(res) {
    hideLoading();
    var data = res.data || [];
    var html = '<div class="card mt-4"><div class="card-header">';
    html += '<h3 class="font-semibold text-gray-700 text-sm">รายงานรับวัสดุเข้าคลัง (' + data.length + ' รายการ)</h3>';
    html += '<button onclick="exportReport(\'receives\')" class="btn-success btn-sm flex items-center gap-1"><i class="fi fi-rr-file-spreadsheet"></i> Export CSV</button></div>';
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
    if (data.length > 50) html += '<tr><td colspan="6" class="text-center py-3 text-xs text-gray-400">แสดง 50 รายการแรก Export เพื่อดูทั้งหมด</td></tr>';
    html += '</tbody></table></div></div>';
    document.getElementById('reportDataSection').innerHTML = html;
    document.getElementById('reportDataSection').scrollIntoView({ behavior:'smooth' });
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function loadWithdrawReport() {
  showLoading('โหลดรายงาน...');
  callAPI('getWithdrawals', AUTH.token, { status:'all' }).then(function(res) {
    hideLoading();
    var data = res.data || [];
    var html = '<div class="card mt-4"><div class="card-header">';
    html += '<h3 class="font-semibold text-gray-700 text-sm">รายงานเบิกวัสดุออก (' + data.length + ' รายการ)</h3>';
    html += '<button onclick="exportReport(\'withdrawals\')" class="btn-success btn-sm flex items-center gap-1"><i class="fi fi-rr-file-spreadsheet"></i> Export CSV</button></div>';
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
    if (data.length > 50) html += '<tr><td colspan="7" class="text-center py-3 text-xs text-gray-400">แสดง 50 รายการแรก Export เพื่อดูทั้งหมด</td></tr>';
    html += '</tbody></table></div></div>';
    document.getElementById('reportDataSection').innerHTML = html;
    document.getElementById('reportDataSection').scrollIntoView({ behavior:'smooth' });
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

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
    html += '<button onclick="exportMonthlyExcel(' + year + ',' + month + ')" class="btn-success btn-sm flex items-center gap-1"><i class="fi fi-rr-file-spreadsheet"></i> Export CSV</button></div>';
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
  callAPI('getUsers', AUTH.token).then(function(res) {
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
  var html = '<div class="fade-in w-full space-y-4">';

  html += '<div class="card p-6">';
  html += '<div class="flex items-center gap-5 mb-6">';
  html += '<div class="relative">';
  html += '<div class="w-20 h-20 rounded-2xl bg-navy-100 flex items-center justify-center overflow-hidden shadow">';
  html += '<i class="fi fi-rr-user text-navy-600 text-3xl"></i>';
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

  html += '<div class="card p-6"><h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fi fi-rr-lock text-navy-600"></i> เปลี่ยนรหัสผ่าน</h3>';
  html += '<div class="space-y-3">';
  html += passFieldHTML('รหัสผ่านเดิม *', 'profOldPass');
  html += passFieldHTML('รหัสผ่านใหม่ *', 'profNewPass');
  html += passFieldHTML('ยืนยันรหัสผ่านใหม่ *', 'profConfPass');
  html += '</div>';
  html += '<div class="flex justify-end mt-4"><button onclick="doChangePassword()" class="btn-primary"><i class="fi fi-rr-lock mr-1"></i>เปลี่ยนรหัสผ่าน</button></div></div>';

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

// ===== USERS =====
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
  showConfirm('Reset รหัสผ่าน','ระบบจะสร้างรหัสผ่านชั่วคราวใหม่', function() {
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
  callAPI('getConfig', AUTH.token).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    buildSettingsPage(res.data);
  }).catch(function(){ hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildSettingsPage(cfg) {
  cfg = cfg || {};
  var html = '<div class="fade-in w-full space-y-4">';

  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 flex items-center gap-2"><i class="fi fi-rr-building text-navy-600"></i> ข้อมูลหน่วยงาน</h3></div>';
  html += '<div class="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">';
  html += fieldHTML('ชื่อระบบ', 'cfgAppName', 'text', cfg.app_name||'', 'sm:col-span-2');
  html += fieldHTML('ชื่อหน่วยงาน', 'cfgOrgName', 'text', cfg.organization_name||'', 'sm:col-span-2');
  html += fieldHTML('ที่อยู่', 'cfgOrgAddr', 'text', cfg.organization_address||'', 'sm:col-span-2');
  html += fieldHTML('เบอร์โทรศัพท์', 'cfgOrgPhone', 'text', cfg.organization_phone||'');
  html += fieldHTML('อีเมลหน่วยงาน', 'cfgOrgEmail', 'email', cfg.organization_email||'');
  html += '</div></div>';

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

  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 flex items-center gap-2"><i class="fi fi-rr-layers text-navy-600"></i> การตั้งค่าสต็อก</h3></div>';
  html += '<div class="card-body">';
  html += fieldHTML('ระดับสต็อกขั้นต่ำเริ่มต้น', 'cfgLowStock', 'number', cfg.low_stock_threshold||5);
  html += '</div></div>';

  html += '<div class="flex justify-end gap-3">';
  html += '<button onclick="renderSettings()" class="btn-secondary"><i class="fi fi-rr-refresh mr-1"></i>รีเซ็ต</button>';
  html += '<button onclick="saveSettings()" class="btn-primary"><i class="fi fi-rr-disk mr-1"></i>บันทึกการตั้งค่า</button></div>';

  html += '</div>';
  document.getElementById('mainContent').innerHTML = html;
}

function saveSettings() {
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
  showLoading('กำลังบันทึก...');
  callAPI('saveConfig', AUTH.token, data).then(function(res) {
    hideLoading();
    if (res.success) {
      document.getElementById('sidebarAppName').textContent = data.app_name || 'ระบบวัสดุสิ้นเปลือง';
      showSuccess(res.message);
    } else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

function doTestTelegram() {
  showLoading('กำลังส่ง Test Message...');
  callAPI('testTelegram', AUTH.token).then(function(res) {
    hideLoading();
    if (res.success) showSuccess(res.message);
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

// ===== QR SCANNER =====
var _qrScanner = null;
function renderQRScanner() {
  var html = '<div class="fade-in space-y-4">';
  html += '<div class="card p-6 text-center">';
  html += '<h3 class="font-semibold text-gray-700 mb-4"><i class="fi fi-rr-qr-scan text-navy-600 mr-2"></i>สแกน QR Code เพื่อเบิกวัสดุ</h3>';
  html += '<div id="qr-reader"></div>';
  html += '<p class="text-xs text-gray-400 mt-3">อนุญาตให้ใช้กล้องเพื่อสแกน QR Code ได้เลย</p>';
  html += '<button onclick="stopQRScanner()" class="btn-secondary btn-sm mt-4"><i class="fi fi-rr-cross mr-1"></i>ปิดกล้อง</button>';
  html += '</div></div>';
  document.getElementById('mainContent').innerHTML = html;

  setTimeout(function() {
    try {
      _qrScanner = new Html5Qrcode('qr-reader');
      _qrScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        function(decodedText) {
          stopQRScanner();
          try {
            var url = new URL(decodedText);
            var action = url.searchParams.get('action');
            var itemId = url.searchParams.get('item_id');
            if (action === 'withdraw' && itemId) {
              openWithdrawFromQR(itemId);
            } else {
              showError('QR Code ไม่ถูกต้อง');
            }
          } catch(e) {
            showError('QR Code ไม่ถูกต้อง');
          }
        },
        function(errorMessage) {}
      ).catch(function(err) {
        console.error(err);
        showError('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้งานกล้องในเบราว์เซอร์');
      });
    } catch(e) {
      console.error(e);
      showError('เบราว์เซอร์นี้ไม่รองรับการใช้งานกล้อง');
    }
  }, 300);
}

function stopQRScanner() {
  if (_qrScanner) {
    _qrScanner.stop().then(function() { _qrScanner = null; }).catch(function() { _qrScanner = null; });
  }
}

// ===== ON LOAD =====
window.onload = function() {
  document.getElementById('loginYear').textContent = (new Date().getFullYear() + 543);

  // Parse URL params for QR
  var urlParams = new URLSearchParams(window.location.search);
  _QR_ACTION = urlParams.get('action') || '';
  _QR_ITEM_ID = urlParams.get('item_id') || '';

  if (AUTH.token) { initApp(); }
  else { showLoginPage(); }
};

