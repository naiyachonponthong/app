<script>
// ============================================================
// js2.html — Items (คลัง) | Stock | Receive | QR Generator
// ============================================================

var _itemsData = [];
var _itemsPage = 1;
var _itemsFilter = { search:'', category:'all', stock:'all' };
var _itemImageFileId = null;

// ===== ITEMS LIST =====
function renderItems() {
  if (AUTH.user.role !== 'admin') { loadPage('stock'); return; }
  showLoading('โหลดรายการวัสดุ...');
  callAPI('getItems', AUTH.token).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    _itemsData = res.data;
    _itemsPage  = 1;
    buildItemsPage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildItemsPage() {
  var filtered = filterItems(_itemsData, _itemsFilter);
  var paged    = paginate(filtered, _itemsPage);
  var cats     = getCategoryList(_itemsData);

  var html = '<div class="fade-in space-y-4">';

  // Header
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

  // Summary chips
  html += '<div class="flex gap-2 flex-wrap text-xs">';
  html += '<span class="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium"><i class="fi fi-rr-box-open-full mr-1"></i>ทั้งหมด: ' + _itemsData.length + '</span>';
  var lowCount = _itemsData.filter(function(i){ return i.current_stock <= i.min_stock; }).length;
  if (lowCount > 0) html += '<span class="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full font-medium"><i class="fi fi-rr-triangle-warning mr-1"></i>ใกล้หมด: ' + lowCount + '</span>';
  html += '</div>';

  // Table (Desktop)
  html += '<div class="card overflow-hidden">';
  html += '<div class="hidden md:block overflow-x-auto">';
  html += '<table class="w-full text-sm"><thead class="bg-gray-50 text-gray-600 text-xs">';
  html += '<tr><th class="px-4 py-3 text-left w-10">#</th>';
  html += '<th class="px-4 py-3 text-left w-14">รูป</th>';
  html += '<th class="px-4 py-3 text-left">รหัส</th>';
  html += '<th class="px-4 py-3 text-left">ชื่อวัสดุ</th>';
  html += '<th class="px-4 py-3 text-left">ขนาด</th>';
  html += '<th class="px-4 py-3 text-left">หน่วย</th>';
  html += '<th class="px-4 py-3 text-left">หมวดหมู่</th>';
  html += '<th class="px-4 py-3 text-center">สต็อก</th>';
  html += '<th class="px-4 py-3 text-center">ขั้นต่ำ</th>';
  html += '<th class="px-4 py-3 text-center">สถานะ</th>';
  html += '<th class="px-4 py-3 text-center">จัดการ</th></tr></thead>';
  html += '<tbody class="divide-y divide-gray-100">';
  if (paged.length === 0) {
    html += '<tr><td colspan="11" class="text-center py-10 text-gray-400">ไม่พบรายการ</td></tr>';
  }
  paged.forEach(function(item, idx) {
    var sClass = getStockClass(item.current_stock, item.min_stock);
    var sLabel = getStockLabel(item.current_stock, item.min_stock);
    var imgHtml = item.image_file_id ? '<img src="https://drive.google.com/thumbnail?id=' + item.image_file_id + '&sz=w100-h100" class="w-10 h-10 object-cover rounded-lg border border-gray-200">' : '<div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><i class="fi fi-rr-box-open-full text-sm"></i></div>';
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

  // Mobile Cards
  html += '<div class="md:hidden divide-y divide-gray-100">';
  if (paged.length === 0) html += '<p class="text-center text-sm text-gray-400 py-8">ไม่พบรายการ</p>';
  paged.forEach(function(item) {
    var sClass = getStockClass(item.current_stock, item.min_stock);
    var sLabel = getStockLabel(item.current_stock, item.min_stock);
    var imgHtml = item.image_file_id ? '<img src="https://drive.google.com/thumbnail?id=' + item.image_file_id + '&sz=w200-h200" class="w-12 h-12 object-cover rounded-xl border border-gray-200 flex-shrink-0">' : '<div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0"><i class="fi fi-rr-box-open-full text-gray-400 text-lg"></i></div>';
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

  // Pagination
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

// ===== ADD ITEM MODAL =====
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
    imgSection = '<div class="sm:col-span-2"><label class="form-label">รูปภาพวัสดุ</label><div class="flex items-center gap-3"><img id="itemImgPreview" src="https://drive.google.com/thumbnail?id=' + fid + '&sz=w300-h300" class="w-24 h-24 object-cover rounded-xl border border-gray-200"><button onclick="removeItemImage()" type="button" class="text-red-500 text-sm hover:underline">ลบรูป</button></div><input type="hidden" id="itemImageFileId" value="' + fid + '"></div>';
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
        if (preview) preview.innerHTML = '<img src="https://drive.google.com/thumbnail?id=' + res.file_id + '&sz=w300-h300" class="w-24 h-24 object-cover rounded-xl border border-gray-200 mt-2">';
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

// ===== ITEM DETAIL MODAL =====
function showItemDetailModal(itemId) {
  var item = _itemsData.find(function(i){ return i.id === itemId; });
  if (!item) return;
  var sClass = getStockClass(item.current_stock, item.min_stock);
  var sLabel = getStockLabel(item.current_stock, item.min_stock);
  var pct = item.min_stock > 0 ? Math.min(100, Math.round(item.current_stock / (item.min_stock * 3) * 100)) : 50;
  var barColor = item.current_stock <= 0 ? 'bg-red-500' : item.current_stock <= item.min_stock ? 'bg-amber-400' : 'bg-green-500';

  var imgSection = '';
  if (item.image_file_id) {
    imgSection = '<div class="flex justify-center mb-4"><img src="https://drive.google.com/thumbnail?id=' + item.image_file_id + '&sz=w400-h400" class="w-40 h-40 object-cover rounded-2xl border border-gray-200 shadow-sm"></div>';
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
  // Info grid
  body += '<div class="grid grid-cols-2 gap-3">'
    + '<div class="bg-gray-50 rounded-xl p-3 text-center"><p class="text-xs text-gray-400 mb-1">หมวดหมู่</p><p class="text-sm font-semibold text-gray-700">' + escHtml(item.category || '-') + '</p></div>'
    + '<div class="bg-gray-50 rounded-xl p-3 text-center"><p class="text-xs text-gray-400 mb-1">หน่วย</p><p class="text-sm font-semibold text-gray-700">' + escHtml(item.unit) + '</p></div>'
    + '</div>';

  // Stock section
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

  // Description
  if (item.description) {
    body += '<div class="bg-gray-50 rounded-xl p-3"><p class="text-xs text-gray-400 mb-1">หมายเหตุ / รายละเอียด</p><p class="text-sm text-gray-700">' + escHtml(item.description) + '</p></div>';
  }

  // Dates
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

// ===== QR CODE MODAL =====
function showQRModal(itemId) {
  var item = _itemsData.find(function(i){ return i.id === itemId; });
  if (!item) return;
  var gasUrl = window.location.href.split('?')[0];
  var qrUrl  = gasUrl + '?action=withdraw&item_id=' + itemId;
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
  var gasUrl = window.location.href.split('?')[0];
  var qrUrl  = gasUrl + '?action=withdraw&item_id=' + item.id;
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

// ===== STOCK PAGE =====
var _stockData = [];
var _stockView = 'card'; // 'card' | 'table'

function renderStock() {
  showLoading('โหลดสต็อก...');
  callAPI('getItems', AUTH.token).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    _stockData = res.data;
    buildStockPage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildStockPage() {
  var html = '<div class="fade-in space-y-4">';
  // Header
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
      var cardImg = item.image_file_id ? '<img src="https://drive.google.com/thumbnail?id=' + item.image_file_id + '&sz=w200-h200" class="w-10 h-10 object-cover rounded-xl border border-gray-200">' : '<div class="w-10 h-10 bg-navy-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-box-open-full text-navy-700 text-lg"></i></div>';
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
    // Table view
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
  Promise.all([
    callAPI('getItems', AUTH.token),
    callAPI('getReceives', AUTH.token, {})
  ]).then(function(results) {
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
    html += '<td class="px-4 py-2.5 text-center font-bold text-green-700">+' + r.quantity + ' <span class="text-xs font-normal text-gray-500">' + escHtml(r.unit||'') + '</span></td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-600">' + escHtml(r.received_by_name||'-') + '</td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-400">' + escHtml(r.note||'-') + '</td></tr>';
  });
  html += '</tbody></table></div></div>';
  html += '<div id="receivePagination"></div></div>';
  document.getElementById('mainContent').innerHTML = html;
  renderPagination('receivePagination', _receiveData.length, _receivePage, function(p){ _receivePage=p; buildReceivePage(); });
}

function openReceiveModal(itemId) {
  var opts = _itemsData.map(function(i){ return '<option value="' + i.id + '"' + (i.id===itemId?' selected':'') + '>' + escHtml(i.item_code) + ' — ' + escHtml(i.name) + '</option>'; }).join('');
  var body = '<div class="space-y-4">'
    + '<div><label class="form-label">รายการวัสดุ *</label><select id="rcvItemId" class="form-input">' + opts + '</select></div>'
    + '<div class="grid grid-cols-2 gap-3">'
    + '<div><label class="form-label">จำนวนที่รับ *</label><input type="number" id="rcvQty" min="1" value="1" class="form-input"></div>'
    + '<div><label class="form-label">วันที่รับ</label><input type="date" id="rcvDate" value="' + new Date().toISOString().split('T')[0] + '" class="form-input"></div>'
    + '</div>'
    + '<div><label class="form-label">หมายเหตุ</label><input type="text" id="rcvNote" placeholder="เช่น รับจากซัพพลายเออร์" class="form-input"></div>'
    + '</div>';
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="submitReceive()" class="btn-success"><i class="fi fi-rr-check mr-1"></i>บันทึกรับเข้า</button>';
  openModal('บันทึกรับวัสดุเข้าคลัง', body, footer);
}

function submitReceive() {
  var itemId = (document.getElementById('rcvItemId')||{}).value||'';
  var qty    = parseInt((document.getElementById('rcvQty')||{}).value||0);
  var date   = (document.getElementById('rcvDate')||{}).value||'';
  var note   = (document.getElementById('rcvNote')||{}).value||'';
  if (!itemId) { showError('กรุณาเลือกรายการวัสดุ'); return; }
  if (!qty || qty <= 0) { showError('กรุณาระบุจำนวนที่ถูกต้อง'); return; }
  showLoading('กำลังบันทึก...');
  callAPI('addReceive', AUTH.token, { item_id:itemId, quantity:qty, date:date, note:note }).then(function(res) {
    hideLoading(); closeModal();
    if (res.success) { showSuccess('บันทึกรับเข้า ' + res.receive_no + ' เรียบร้อย'); renderReceive(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

// Quick receive from Stock page
function openReceiveModal(itemId) {
  showLoading('โหลดข้อมูล...');
  callAPI('getItems', AUTH.token).then(function(res) {
    hideLoading();
    _itemsData = res.data || [];
    var opts = _itemsData.map(function(i){ return '<option value="' + i.id + '"' + (i.id===itemId?' selected':'') + '>' + escHtml(i.item_code) + ' — ' + escHtml(i.name) + '</option>'; }).join('');
    var body = '<div class="space-y-4">'
      + '<div><label class="form-label">รายการวัสดุ *</label><select id="rcvItemId" class="form-input">' + opts + '</select></div>'
      + '<div class="grid grid-cols-2 gap-3">'
      + '<div><label class="form-label">จำนวนที่รับ *</label><input type="number" id="rcvQty" min="1" value="1" class="form-input"></div>'
      + '<div><label class="form-label">วันที่รับ</label><input type="date" id="rcvDate" value="' + new Date().toISOString().split('T')[0] + '" class="form-input"></div>'
      + '</div><div><label class="form-label">หมายเหตุ</label><input type="text" id="rcvNote" placeholder="เช่น รับจากซัพพลายเออร์" class="form-input"></div></div>';
    var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
      + '<button onclick="submitReceive()" class="btn-success"><i class="fi fi-rr-check mr-1"></i>บันทึกรับเข้า</button>';
    openModal('บันทึกรับวัสดุเข้าคลัง', body, footer);
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

// Withdraw from stock card
function openWithdrawModal(itemId) {
  showLoading('โหลดข้อมูล...');
  callAPI('getItemById', AUTH.token, itemId).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    var item = res.data;
    buildWithdrawModal(item, true);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

// Withdraw from QR URL
function openWithdrawFromQR(itemId) {
  showLoading('โหลดข้อมูลวัสดุ...');
  callAPI('getItemById', AUTH.token, itemId).then(function(res) {
    hideLoading();
    if (!res.success) { showError('ไม่พบรายการวัสดุ กรุณาตรวจสอบ QR Code'); return; }
    buildWithdrawModal(res.data, true);
    loadPage('withdraw');
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

function buildWithdrawModal(item, viaQr) {
  var sClass = getStockClass(item.current_stock, item.min_stock);
  var itemImg = item.image_file_id ? '<img src="https://drive.google.com/thumbnail?id=' + item.image_file_id + '&sz=w200-h200" class="w-12 h-12 object-cover rounded-xl border border-gray-200">' : '<div class="w-12 h-12 bg-navy-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-box-open-full text-navy-700 text-xl"></i></div>';
  var body = '<div class="space-y-4">'
    + '<div class="bg-gray-50 rounded-xl p-4 flex items-center gap-4">'
    + itemImg
    + '<div><p class="font-bold text-gray-800">' + escHtml(item.name) + '</p>'
    + '<p class="text-xs text-gray-500">' + escHtml(item.item_code) + ' • ' + escHtml(item.size||'') + '</p>'
    + '<p class="text-sm mt-1">สต็อก: <b class="text-gray-800">' + item.current_stock + '</b> ' + item.unit + ' <span class="px-2 py-0.5 rounded-full text-xs ml-1 ' + sClass + '">' + getStockLabel(item.current_stock, item.min_stock) + '</span></p>'
    + '</div></div>'
    + (item.current_stock <= 0 ? '<div class="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm font-medium">วัสดุหมดสต็อก ไม่สามารถเบิกได้</div>' : '')
    + '<div><label class="form-label">จำนวนที่ขอเบิก *</label>'
    + '<input type="number" id="wdQty" min="1" max="' + item.current_stock + '" value="1" ' + (item.current_stock<=0?'disabled':'') + ' class="form-input"></div>'
    + '<div><label class="form-label">วัตถุประสงค์ *</label>'
    + '<select id="wdPurpose" class="form-input"><option value="">— เลือกวัตถุประสงค์ —</option>'
    + ['ห้องพยาบาล','ห้องครัว','ห้องทำความสะอาด','สำนักงาน','ห้องเรียน','อื่นๆ'].map(function(p){ return '<option>' + p + '</option>'; }).join('')
    + '</select></div>'
    + '<div><label class="form-label">หมายเหตุ</label><input type="text" id="wdNote" placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" class="form-input"></div>'
    + '<input type="hidden" id="wdItemId" value="' + item.id + '">'
    + '<input type="hidden" id="wdViaQr" value="' + (viaQr?'true':'false') + '">'
    + '</div>';
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + (item.current_stock > 0 ? '<button onclick="submitWithdraw()" class="btn-primary"><i class="fi fi-rr-inbox-out mr-1"></i>ยื่นคำขอเบิก</button>' : '');
  openModal('ยื่นคำขอเบิกวัสดุ', body, footer);
}
</script>
