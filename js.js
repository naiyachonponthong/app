<script>
// ============================================================
// js.html — Auth | Session | Navigation | Dashboard
// ============================================================

// ===== CONSTANTS =====
var ITEMS_PER_PAGE = 20;
var ROLE_LABELS = { admin:'ผู้ดูแลระบบ', staff:'เจ้าหน้าที่คลัง', employee:'พนักงาน' };

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

// ===== API HELPER =====
function callAPI(fn) {
  var args = Array.prototype.slice.call(arguments, 1);
  return new Promise(function(resolve, reject) {
    var runner = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
    runner[fn].apply(runner, args);
  });
}

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
  // ตั้งค่า Sidebar ตาม role
  document.getElementById('sidebarName').textContent = AUTH.user.name || AUTH.user.username;
  document.getElementById('sidebarRole').textContent = ROLE_LABELS[AUTH.user.role] || AUTH.user.role;
  // ซ่อน/แสดง menu ตาม role
  var isAdmin  = AUTH.user.role === 'admin';
  var isStaff  = AUTH.user.role === 'staff';
  var notEmp   = AUTH.user.role !== 'employee';
  document.getElementById('menuItems').style.display    = isAdmin ? '' : 'none';
  document.getElementById('menuReceive').style.display  = notEmp  ? '' : 'none';
  document.getElementById('menuApprove').style.display  = isAdmin ? '' : 'none';
  document.getElementById('menuAdminSection').style.display = isAdmin ? '' : 'none';
  document.getElementById('menuReportLabel').style.display  = notEmp ? '' : 'none';
  document.getElementById('menuReportSection').style.display= notEmp ? '' : 'none';
  // Clock
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
  // Active menu
  document.querySelectorAll('.menu-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-page') === page);
  });
  // Titles
  var titles = {
    dashboard:'ภาพรวมระบบ', stock:'สต็อกคงเหลือ', items:'รายการวัสดุ',
    receive:'รับวัสดุเข้าคลัง', withdraw:'เบิกวัสดุ', approve:'อนุมัติการเบิก',
    transactions:'ประวัติเคลื่อนไหว', reports:'รายงาน',
    users:'จัดการผู้ใช้งาน', settings:'ตั้งค่าระบบ', profile:'โปรไฟล์'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  document.getElementById('pageBreadcrumb').textContent = 'ระบบวัสดุสิ้นเปลือง / ' + (titles[page] || page);
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.add('hidden');
  // Route
  var content = document.getElementById('mainContent');
  content.innerHTML = '<div class="flex items-center justify-center py-16"><div class="w-8 h-8 border-4 border-navy-600 border-t-transparent rounded-full animate-spin"></div></div>';
  setTimeout(function() {
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
  }, 50);
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

    // Update pending badge
    var badge = document.getElementById('pendingBadge');
    if (kpi.pending > 0) { badge.textContent = kpi.pending; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }

    var html = '<div class="fade-in space-y-5">';

    // ===== Low Stock Alert Banner =====
    if (d.low_stock_items && d.low_stock_items.length > 0) {
      html += '<div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">';
      html += '<i class="fi fi-rr-triangle-warning text-amber-500 text-lg mt-0.5 flex-shrink-0"></i>';
      html += '<div class="flex-1">';
      html += '<p class="font-semibold text-amber-800 text-sm">วัสดุใกล้หมด/หมดสต็อก</p>';
      html += '<p class="text-xs text-amber-700 mt-1">' + d.low_stock_items.map(function(i){ return i.name + ' (เหลือ ' + i.current_stock + ' ' + i.unit + ')'; }).join(' • ') + '</p>';
      html += '</div></div>';
    }

    // ===== KPI Cards =====
    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">';
    var kpis = [
      { label:'รายการวัสดุ', value:kpi.total_items, icon:'fi-rr-box-open-full', color:'bg-blue-100', iconColor:'text-blue-600', sub:'รายการทั้งหมด', subIcon:'fi-rr-database' },
      { label:'สต็อกต่ำ/หมด', value:kpi.low_stock, icon:'fi-rr-triangle-warning', color:'bg-amber-100', iconColor:'text-amber-600', sub:'ต้องเติมสต็อก', subIcon:'fi-rr-refresh', danger: kpi.low_stock > 0 },
      { label:'รออนุมัติ', value:kpi.pending, icon:'fi-rr-time-forward', color:'bg-purple-100', iconColor:'text-purple-600', sub:'คำขอเบิก', subIcon:'fi-rr-inbox-out', danger: kpi.pending > 0 },
      { label:'เคลื่อนไหววันนี้', value:kpi.today_tx, icon:'fi-rr-activity', color:'bg-green-100', iconColor:'text-green-600', sub:'รายการ', subIcon:'fi-rr-calendar-day' }
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

    // ===== Workflow Strip =====
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

    // ===== Charts =====
    html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">';

    // Bar Chart — รายเดือน
    html += '<div class="card lg:col-span-2"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-chart-histogram text-navy-600"></i> สถิติรับ-เบิก 6 เดือนล่าสุด</h3></div>';
    html += '<div class="card-body"><div style="position:relative;height:220px"><canvas id="chartMonthly"></canvas></div></div></div>';

    // Donut Chart — หมวดหมู่
    html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-chart-pie text-navy-600"></i> สัดส่วนวัสดุ</h3></div>';
    html += '<div class="card-body"><div style="position:relative;height:220px"><canvas id="chartCategory"></canvas></div></div></div>';

    html += '</div>';

    // ===== Bottom: Recent Transactions + Pending =====
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">';

    // Recent Transactions
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

    // Pending Withdrawals
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

    // Top Items Bar (horizontal)
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

    html += '</div>'; // end fade-in
    document.getElementById('mainContent').innerHTML = html;

    // ===== Render Charts =====
    setTimeout(function() {
      // Monthly Chart
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
      // Category Donut
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

// Quick actions จาก Dashboard
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

// ===== ON LOAD =====
window.onload = function() {
  if (AUTH.token) { initApp(); }
  else { showLoginPage(); }
};
</script>
