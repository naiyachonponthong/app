// ============================================================
// ระบบวัสดุสิ้นเปลือง (Consumable Supplies Management System)
// Version: 1.0 | Google Apps Script + Google Sheets
// ============================================================

const CONFIG = {
  APP_NAME: 'ระบบวัสดุสิ้นเปลือง',
  APP_VERSION: '1.0',
  SESSION_TIMEOUT: 28800,   // 8 ชั่วโมง (วินาที)
  ITEMS_PER_PAGE: 20,
  LOW_STOCK_DEFAULT: 5,
  SALT: 'SUP_SYS_2569_SALT',
  ADMIN_USERS: {
    'admin':    { password: '123456', role: 'admin',    name: 'ผู้ดูแลระบบ',     email: 'admin@school.ac.th' },
    'staff':    { password: '123456', role: 'staff',    name: 'เจ้าหน้าที่คลัง',  email: 'staff@school.ac.th' },
    'employee': { password: '123456', role: 'employee', name: 'พนักงาน 01',      email: 'emp@school.ac.th' }
  },
  USER_ROLES: {
    'admin':    { name: 'ผู้ดูแลระบบ',    permissions: ['all'] },
    'staff':    { name: 'เจ้าหน้าที่คลัง', permissions: ['view','receive','withdraw','report'] },
    'employee': { name: 'พนักงาน',        permissions: ['view_own','withdraw'] }
  }
};

// ข้อมูลเริ่มต้น 28 รายการวัสดุสิ้นเปลือง (นำเข้าจาก Excel)
const SEED_ITEMS = [
  { name:'ถุงมือยาง (ไม่มีแป้ง) สีฟ้า', size:'size S', unit:'กล่อง',  category:'อุปกรณ์ป้องกัน',      stock:9,  min_stock:2 },
  { name:'ถุงมือยาง (ไม่มีแป้ง) สีฟ้า', size:'size M', unit:'กล่อง',  category:'อุปกรณ์ป้องกัน',      stock:2,  min_stock:2 },
  { name:'สำลี',                          size:'200 g.', unit:'ม้วน',   category:'วัสดุทำความสะอาด',    stock:48, min_stock:10 },
  { name:'กระดาษทิชชู่สก็อตเอ็กซ์ตร้า หนา 2 ชั้น', size:'', unit:'ม้วน', category:'วัสดุทำความสะอาด', stock:79, min_stock:20 },
  { name:'กระดาษทิชชู่เช็ดมือ',          size:'',       unit:'แพ็ค',   category:'วัสดุทำความสะอาด',    stock:36, min_stock:5 },
  { name:'น้ำยาถูพื้น มิสเตอร์มัสโซ (สีแดง)', size:'5000 mL', unit:'แกลลอน', category:'น้ำยาทำความสะอาด', stock:3, min_stock:2 },
  { name:'น้ำยาล้างจาน',                  size:'3200 mL', unit:'แกลลอน', category:'น้ำยาทำความสะอาด', stock:2,  min_stock:2 },
  { name:'ผงซักฟอก',                      size:'17000 g', unit:'ถุง',   category:'น้ำยาทำความสะอาด',   stock:5,  min_stock:2 },
  { name:'สก็อต ไบร์ท',                   size:'-',      unit:'ชิ้น',   category:'อุปกรณ์ทำความสะอาด', stock:10, min_stock:3 },
  { name:'ฟลอยด์ ยี่ห้อไดอะมอนด์',        size:'12"×75 ฟุต', unit:'กล่อง', category:'วัสดุบรรจุภัณฑ์', stock:4,  min_stock:2 },
  { name:'ผ้าถูพื้นกลมสก็อตไบร์ 3M',     size:'41×0.1×24 cm', unit:'ผืน', category:'อุปกรณ์ทำความสะอาด', stock:6, min_stock:2 },
  { name:'ผ้าไมโครไฟเบอร์',               size:'40×40 cm', unit:'ผืน', category:'อุปกรณ์ทำความสะอาด', stock:15, min_stock:5 },
  { name:'แปรงล้างขวดนม',                  size:'-',      unit:'อัน',   category:'อุปกรณ์ทำความสะอาด', stock:3,  min_stock:1 },
  { name:'หมวกคลุมผมตัวหนอน',              size:'100 ชิ้น/แพ็ค', unit:'PAC', category:'อุปกรณ์ป้องกัน', stock:5, min_stock:2 },
  { name:'น้ำยาเช็ดกระจก',                 size:'-',      unit:'ขวด',   category:'น้ำยาทำความสะอาด',   stock:4,  min_stock:2 },
  { name:'ตะกร้าเล็ก',                     size:'-',      unit:'อัน',   category:'อุปกรณ์จัดเก็บ',     stock:8,  min_stock:3 },
  { name:'ตะกร้าใหญ่',                     size:'-',      unit:'อัน',   category:'อุปกรณ์จัดเก็บ',     stock:5,  min_stock:2 },
  { name:'ถังถูบ้านแบบเหยียบ',             size:'-',      unit:'ถัง',   category:'อุปกรณ์ทำความสะอาด', stock:4,  min_stock:2 },
  { name:'ที่กวาดหยากไย่พลาสติก',          size:'-',      unit:'อัน',   category:'อุปกรณ์ทำความสะอาด', stock:5,  min_stock:2 },
  { name:'ไม้ขนไก่เล็ก',                   size:'-',      unit:'อัน',   category:'อุปกรณ์ทำความสะอาด', stock:6,  min_stock:2 },
  { name:'ไม้กวาด กวาดพื้น',               size:'-',      unit:'อัน',   category:'อุปกรณ์ทำความสะอาด', stock:4,  min_stock:2 },
  { name:'ปลั๊กสามตา Toshino 4 ช่อง',     size:'5 m',    unit:'อัน',   category:'อุปกรณ์ไฟฟ้า',       stock:3,  min_stock:1 },
  { name:'ถุงซิปใส 9×13 cm',               size:'KG',     unit:'KG',    category:'วัสดุบรรจุภัณฑ์',    stock:5,  min_stock:2 },
  { name:'ถุงซิปใส 15×23 cm',              size:'KG',     unit:'KG',    category:'วัสดุบรรจุภัณฑ์',    stock:4,  min_stock:2 },
  { name:'ถุงซิปใส 23×35 cm',              size:'KG',     unit:'KG',    category:'วัสดุบรรจุภัณฑ์',    stock:3,  min_stock:1 },
  { name:'ถุงร้อน 10×15 นิ้ว',             size:'2 KG',   unit:'PAC',   category:'วัสดุบรรจุภัณฑ์',    stock:8,  min_stock:3 },
  { name:'สบู่เหลวล้างมือ',                size:'3.8 ลิตร', unit:'อัน', category:'น้ำยาทำความสะอาด',   stock:4,  min_stock:2 },
  { name:'ไส้กรอง PP 10 นิ้ว 1 ไมครอน',   size:'-',      unit:'อัน',   category:'อุปกรณ์อื่นๆ',       stock:5,  min_stock:2 }
];

// ============================================================
// ENTRY POINT
// ============================================================

/**
 * doGet — จุดเข้าหลักของ Web App
 * รองรับ ?action=withdraw&item_id=UUID สำหรับ QR Scan
 */
function doGet(e) {
  try {
    initializeSheets();
    var params = e ? e.parameter : {};

    // API mode: ถ้ามี ?fn=xxx ให้ return JSON แทน HTML (สำหรับ static frontend)
    if (params.fn) {
      var fn = params.fn;
      var args = [];
      try { args = JSON.parse(params.args || '[]'); } catch(err) { args = []; }
      var result;
      switch (fn) {
        case 'login':               result = login(args[0], args[1], args[2]); break;
        case 'validateSession':     result = validateSession(args[0]); break;
        case 'logout':              result = logout(args[0]); break;
        case 'forgotPassword':      result = forgotPassword(args[0]); break;
        case 'getItems':            result = getItems(args[0]); break;
        case 'getItemById':         result = getItemById(args[0], args[1]); break;
        case 'addItem':             result = addItem(args[0], args[1]); break;
        case 'updateItem':          result = updateItem(args[0], args[1], args[2]); break;
        case 'deleteItem':          result = deleteItem(args[0], args[1]); break;
        case 'addReceive':          result = addReceive(args[0], args[1]); break;
        case 'getReceives':         result = getReceives(args[0], args[1]); break;
        case 'addWithdrawal':       result = addWithdrawal(args[0], args[1]); break;
        case 'getWithdrawals':      result = getWithdrawals(args[0], args[1]); break;
        case 'approveWithdrawal':   result = approveWithdrawal(args[0], args[1], args[2]); break;
        case 'rejectWithdrawal':    result = rejectWithdrawal(args[0], args[1], args[2]); break;
        case 'getTransactions':     result = getTransactions(args[0], args[1]); break;
        case 'getDashboardStats':   result = getDashboardStats(args[0]); break;
        case 'getUsers':            result = getUsers(args[0]); break;
        case 'addUser':             result = addUser(args[0], args[1]); break;
        case 'updateUser':          result = updateUser(args[0], args[1], args[2]); break;
        case 'changePassword':      result = changePassword(args[0], args[1], args[2]); break;
        case 'resetUserPassword':   result = resetUserPassword(args[0], args[1]); break;
        case 'toggleUserActive':    result = toggleUserActive(args[0], args[1]); break;
        case 'saveConfig':          result = saveConfig(args[0], args[1]); break;
        case 'getConfig':           result = { success: true, data: getConfig() }; break;
        case 'getMonthlyReport':    result = getMonthlyReport(args[0], args[1], args[2]); break;
        case 'generateExportUrl':   result = generateExportUrl(args[0], args[1], args[2]); break;
        case 'uploadFile':          result = uploadFile(args[0], args[1], args[2], args[3]); break;
        case 'testTelegram':        result = testTelegram(args[0]); break;
        default:
          result = { success: false, message: 'Unknown function: ' + fn };
      }
      return jsonResponse(result);
    }

    var template = HtmlService.createTemplateFromFile('index');
    var cfg = getConfig();
    template.appName = cfg.app_name || CONFIG.APP_NAME;
    template.appLogo = cfg.app_logo || '';
    template.qrAction = params.action || '';
    template.qrItemId = params.item_id || '';
    return template.evaluate()
      .setTitle(template.appName)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    logError('doGet', err);
    return HtmlService.createHtmlOutput('<h2 style="font-family:sans-serif;padding:2rem">เกิดข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ</h2>');
  }
}

/** include — ดึงเนื้อหาไฟล์ HTML */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================
// INITIALIZE SHEETS
// ============================================================

/**
 * initializeSheets — สร้าง/ตรวจสอบ Sheets ทั้งหมด
 * เรียกทุกครั้งที่ doGet ทำงาน (ปลอดภัยถ้ามีอยู่แล้ว)
 */
/**
 * doOptions — CORS preflight
 */
function doOptions(e) {
  var output = ContentService.createTextOutput('');
  output.setMimeType(ContentService.MimeType.TEXT);
  return output;
}

function doPost(e) {
  return jsonResponse({ success: false, message: 'POST disabled. Use GET with ?fn=...&args=[...]' });
}

function jsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function initializeSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNames = ss.getSheets().map(function(s){ return s.getName(); });

  var required = {
    'Config':       'config_json',
    'Users':        'user_json',
    'Sessions':     'session_json',
    'Items':        'item_json',
    'Receives':     'receive_json',
    'Withdrawals':  'withdrawal_json',
    'Transactions': 'transaction_json',
    'Errors':       'error_json'
  };

  Object.keys(required).forEach(function(name) {
    if (sheetNames.indexOf(name) === -1) {
      var sheet = ss.insertSheet(name);
      sheet.appendRow([required[name]]);
    }
  });

  // Seed Config ถ้ายังว่าง
  if (getSheetData('Config').length === 0) {
    saveToSheet('Config', {
      app_name: CONFIG.APP_NAME,
      app_logo: '',
      organization_name: 'โรงเรียนอนุบาลทราย',
      organization_address: '',
      organization_phone: '',
      organization_email: '',
      telegram_bot_token: '',
      telegram_chat_id: '',
      telegram_enabled: false,
      low_stock_threshold: CONFIG.LOW_STOCK_DEFAULT,
      app_version: CONFIG.APP_VERSION
    });
  }

  // Seed Users ถ้ายังว่าง
  if (getSheetData('Users').length === 0) {
    Object.keys(CONFIG.ADMIN_USERS).forEach(function(username) {
      var u = CONFIG.ADMIN_USERS[username];
      saveToSheet('Users', {
        id: Utilities.getUuid(),
        username: username,
        password: hashPassword(u.password),
        role: u.role,
        name: u.name,
        email: u.email,
        phone: '',
        avatar: '',
        telegram_chat_id: '',
        active: true,
        last_login: ''
      });
    });
  }

  // Seed Items ถ้ายังว่าง
  if (getSheetData('Items').length === 0) {
    var year = new Date().getFullYear();
    SEED_ITEMS.forEach(function(item, idx) {
      var code = 'SUP-' + String(idx + 1).padStart(3, '0');
      saveToSheet('Items', {
        id: Utilities.getUuid(),
        item_code: code,
        name: item.name,
        size: item.size,
        unit: item.unit,
        category: item.category,
        current_stock: item.stock,
        min_stock: item.min_stock,
        description: '',
        image_file_id: '',
        active: true
      });
    });
  }

  return { status: 'success', message: 'Sheets พร้อมใช้งาน' };
}

// ============================================================
// AUTHENTICATION
// ============================================================

/** login — เข้าสู่ระบบด้วย username + password */
function login(username, password, role) {
  try {
    var users = getSheetData('Users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].username === username && users[i].active) { user = users[i]; break; }
    }
    if (!user) return { success: false, message: 'ไม่พบชื่อผู้ใช้งานในระบบ' };
    if (!verifyPassword(password, user.password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
    if (role && user.role !== role) return { success: false, message: 'บทบาทไม่ถูกต้อง กรุณาเลือกแท็บให้ตรง' };

    var token = Utilities.getUuid();
    var now = new Date();
    saveToSheet('Sessions', {
      id: Utilities.getUuid(),
      token: token,
      user_id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      expires_at: new Date(now.getTime() + CONFIG.SESSION_TIMEOUT * 1000).toISOString()
    });
    updateInSheet('Users', user.id, { last_login: now.toISOString() });

    return {
      success: true,
      token: token,
      user: { id: user.id, username: user.username, role: user.role, name: user.name, avatar: user.avatar || '' }
    };
  } catch(err) {
    logError('login', err);
    return { success: false, message: 'เกิดข้อผิดพลาดในระบบ' };
  }
}

/** validateSession — ตรวจสอบ token ที่ส่งมา */
function validateSession(token) {
  try {
    if (!token) return null;
    var sessions = getSheetData('Sessions');
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      if (s.token === token) {
        if (new Date(s.expires_at) < new Date()) {
          deleteFromSheet('Sessions', s.id, true);
          return null;
        }
        return s;
      }
    }
    return null;
  } catch(err) { return null; }
}

/** logout — ยกเลิก session */
function logout(token) {
  try {
    var sessions = getSheetData('Sessions');
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].token === token) { deleteFromSheet('Sessions', sessions[i].id, true); break; }
    }
    return { success: true };
  } catch(err) { return { success: false }; }
}

/** forgotPassword — ส่งรหัสผ่านชั่วคราวทางอีเมล */
function forgotPassword(email) {
  try {
    var users = getSheetData('Users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === email && users[i].active) { user = users[i]; break; }
    }
    if (!user) return { success: false, message: 'ไม่พบอีเมลนี้ในระบบ' };
    var tmpPass = Math.random().toString(36).slice(-8).toUpperCase();
    updateInSheet('Users', user.id, { password: hashPassword(tmpPass) });
    var cfg = getConfig();
    MailApp.sendEmail({
      to: email,
      subject: 'รีเซ็ตรหัสผ่าน — ' + cfg.app_name,
      htmlBody: '<div style="font-family:sans-serif"><h2>รีเซ็ตรหัสผ่าน</h2>'
        + '<p>สวัสดี คุณ' + user.name + '</p>'
        + '<p>รหัสผ่านชั่วคราว: <strong style="font-size:1.2em;color:#1e3a8a">' + tmpPass + '</strong></p>'
        + '<p>กรุณาเปลี่ยนรหัสผ่านหลังจาก Login</p></div>'
    });
    return { success: true, message: 'ส่งรหัสผ่านชั่วคราวไปที่อีเมลเรียบร้อย' };
  } catch(err) {
    logError('forgotPassword', err);
    return { success: false, message: 'ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่' };
  }
}

// ============================================================
// ITEMS (รายการวัสดุ)
// ============================================================

/** getItems — ดึงรายการวัสดุทั้งหมด */
function getItems(token) {
  try {
    if (!validateSession(token)) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var items = getSheetData('Items').filter(function(i){ return i.active !== false; });
    items.sort(function(a,b){ return (a.item_code||'').localeCompare(b.item_code||''); });
    return { success: true, data: items };
  } catch(err) {
    logError('getItems', err);
    return { success: false, message: err.message };
  }
}

/** getItemById — ดึงวัสดุตาม ID (สำหรับ QR scan) */
function getItemById(token, itemId) {
  try {
    if (!validateSession(token)) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var items = getSheetData('Items');
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === itemId) return { success: true, data: items[i] };
    }
    return { success: false, message: 'ไม่พบรายการวัสดุ' };
  } catch(err) { return { success: false, message: err.message }; }
}

/** addItem — เพิ่มรายการวัสดุใหม่ (Admin) */
function addItem(token, itemData) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
    var items = getSheetData('Items');
    var code = 'SUP-' + String(items.length + 1).padStart(3, '0');
    var newItem = {
      id: Utilities.getUuid(),
      item_code: code,
      name: itemData.name,
      size: itemData.size || '',
      unit: itemData.unit,
      category: itemData.category || 'อื่นๆ',
      current_stock: parseInt(itemData.current_stock) || 0,
      min_stock: parseInt(itemData.min_stock) || 5,
      description: itemData.description || '',
      image_file_id: itemData.image_file_id || '',
      active: true
    };
    saveToSheet('Items', newItem);
    return { success: true, data: newItem, message: 'เพิ่มรายการวัสดุเรียบร้อย' };
  } catch(err) {
    logError('addItem', err);
    return { success: false, message: err.message };
  }
}

/** updateItem — แก้ไขรายการวัสดุ (Admin) */
function updateItem(token, itemId, itemData) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
    var updated = updateInSheet('Items', itemId, {
      name: itemData.name,
      size: itemData.size,
      unit: itemData.unit,
      category: itemData.category,
      min_stock: parseInt(itemData.min_stock),
      description: itemData.description,
      image_file_id: itemData.image_file_id || ''
    });
    if (!updated) return { success: false, message: 'ไม่พบรายการ' };
    return { success: true, message: 'แก้ไขเรียบร้อย' };
  } catch(err) {
    logError('updateItem', err);
    return { success: false, message: err.message };
  }
}

/** deleteItem — ปิดใช้งานรายการวัสดุ (soft delete) */
function deleteItem(token, itemId) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
    updateInSheet('Items', itemId, { active: false });
    return { success: true, message: 'ลบรายการเรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

// ============================================================
// RECEIVES (รับวัสดุเข้าคลัง)
// ============================================================

/** addReceive — บันทึกการรับวัสดุเข้า (Admin + Staff) */
function addReceive(token, receiveData) {
  try {
    var session = validateSession(token);
    if (!session || session.role === 'employee') return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);
    try {
      // ดึงข้อมูลวัสดุ
      var items = getSheetData('Items');
      var item = null;
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === receiveData.item_id) { item = items[i]; break; }
      }
      if (!item) return { success: false, message: 'ไม่พบรายการวัสดุ' };

      var qty = parseInt(receiveData.quantity);
      if (!qty || qty <= 0) return { success: false, message: 'จำนวนไม่ถูกต้อง' };

      var stockBefore = item.current_stock || 0;
      var stockAfter = stockBefore + qty;

      // อัพเดต stock
      updateInSheet('Items', item.id, { current_stock: stockAfter });

      // เลขที่รับ
      var recNo = generateRunningNumber('RCV', 'Receives');

      // บันทึก Receive
      var rec = {
        id: Utilities.getUuid(),
        receive_no: recNo,
        item_id: item.id,
        item_name: item.name,
        item_code: item.item_code,
        quantity: qty,
        unit: item.unit,
        received_by: session.user_id,
        received_by_name: session.name,
        note: receiveData.note || '',
        date: receiveData.date || new Date().toISOString().split('T')[0]
      };
      saveToSheet('Receives', rec);

      // บันทึก Transaction
      saveToSheet('Transactions', {
        id: Utilities.getUuid(),
        type: 'receive',
        item_id: item.id,
        item_name: item.name,
        item_code: item.item_code,
        quantity: qty,
        stock_before: stockBefore,
        stock_after: stockAfter,
        ref_id: recNo,
        actor_id: session.user_id,
        actor_name: session.name,
        actor_role: session.role,
        note: receiveData.note || '',
        date: rec.date
      });

      // Telegram
      var msg = '<b>รับวัสดุเข้าคลัง</b> #' + recNo
        + '\nรายการ: ' + item.name + ' (' + item.size + ')'
        + '\nจำนวน: +' + qty + ' ' + item.unit
        + '\nสต็อกคงเหลือ: ' + stockAfter + ' ' + item.unit
        + '\nโดย: ' + session.name
        + '\nวันที่: ' + rec.date;
      sendTelegram(msg);

      return { success: true, message: 'บันทึกรับเข้าเรียบร้อย', receive_no: recNo };
    } finally { lock.releaseLock(); }
  } catch(err) {
    logError('addReceive', err);
    return { success: false, message: err.message };
  }
}

/** getReceives — ดึงประวัติการรับเข้า */
function getReceives(token, filters) {
  try {
    if (!validateSession(token)) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var data = getSheetData('Receives');
    if (filters && filters.date_from) {
      data = data.filter(function(r){ return r.date >= filters.date_from; });
    }
    if (filters && filters.date_to) {
      data = data.filter(function(r){ return r.date <= filters.date_to; });
    }
    data.sort(function(a,b){ return b.created_at > a.created_at ? 1 : -1; });
    return { success: true, data: data };
  } catch(err) { return { success: false, message: err.message }; }
}

// ============================================================
// WITHDRAWALS (คำขอเบิกวัสดุ)
// ============================================================

/** addWithdrawal — ยื่นคำขอเบิก */
function addWithdrawal(token, wdData) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };

    var items = getSheetData('Items');
    var item = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === wdData.item_id) { item = items[i]; break; }
    }
    if (!item) return { success: false, message: 'ไม่พบรายการวัสดุ' };

    var qty = parseInt(wdData.quantity);
    if (!qty || qty <= 0) return { success: false, message: 'กรุณาระบุจำนวนให้ถูกต้อง' };
    if (qty > item.current_stock) return { success: false, message: 'จำนวนที่ขอเกินสต็อกคงเหลือ' };

    var wdNo = generateRunningNumber('WD', 'Withdrawals');

    var wd = {
      id: Utilities.getUuid(),
      withdraw_no: wdNo,
      item_id: item.id,
      item_name: item.name,
      item_code: item.item_code,
      quantity_requested: qty,
      quantity_approved: 0,
      unit: item.unit,
      purpose: wdData.purpose || '',
      note: wdData.note || '',
      status: 'pending',
      requested_by: session.user_id,
      requested_by_name: session.name,
      requested_at: new Date().toISOString(),
      approved_by: '',
      approved_by_name: '',
      approved_at: '',
      reject_reason: '',
      via_qr: wdData.via_qr || false
    };
    saveToSheet('Withdrawals', wd);

    var msg = '<b>คำขอเบิกใหม่</b> #' + wdNo
      + '\nรายการ: ' + item.name
      + '\nจำนวน: ' + qty + ' ' + item.unit
      + '\nผู้ขอ: ' + session.name + ' (' + CONFIG.USER_ROLES[session.role].name + ')'
      + '\nวัตถุประสงค์: ' + (wdData.purpose || '-')
      + '\nสต็อกคงเหลือ: ' + item.current_stock + ' ' + item.unit;
    sendTelegram(msg);

    return { success: true, message: 'ยื่นคำขอเบิกเรียบร้อย รอการอนุมัติ', withdraw_no: wdNo };
  } catch(err) {
    logError('addWithdrawal', err);
    return { success: false, message: err.message };
  }
}

/** getWithdrawals — ดึงคำขอเบิกทั้งหมด (Admin/Staff) หรือของตัวเอง (Employee) */
function getWithdrawals(token, filters) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var data = getSheetData('Withdrawals');
    if (session.role === 'employee') {
      data = data.filter(function(w){ return w.requested_by === session.user_id; });
    }
    if (filters && filters.status && filters.status !== 'all') {
      data = data.filter(function(w){ return w.status === filters.status; });
    }
    data.sort(function(a,b){ return b.requested_at > a.requested_at ? 1 : -1; });
    return { success: true, data: data };
  } catch(err) { return { success: false, message: err.message }; }
}

/** approveWithdrawal — อนุมัติการเบิก (Admin เท่านั้น) */
function approveWithdrawal(token, wdId, qtyApproved) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์อนุมัติ' };
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);
    try {
      var wds = getSheetData('Withdrawals');
      var wd = null;
      for (var i = 0; i < wds.length; i++) {
        if (wds[i].id === wdId) { wd = wds[i]; break; }
      }
      if (!wd) return { success: false, message: 'ไม่พบคำขอเบิก' };
      if (wd.status !== 'pending') return { success: false, message: 'คำขอนี้ดำเนินการแล้ว' };

      var qty = parseInt(qtyApproved) || wd.quantity_requested;

      // ดึง item และตัด stock
      var items = getSheetData('Items');
      var item = null;
      for (var j = 0; j < items.length; j++) {
        if (items[j].id === wd.item_id) { item = items[j]; break; }
      }
      if (!item) return { success: false, message: 'ไม่พบรายการวัสดุ' };
      if (qty > item.current_stock) return { success: false, message: 'สต็อกไม่พอ (' + item.current_stock + ' ' + item.unit + ')' };

      var stockBefore = item.current_stock;
      var stockAfter = stockBefore - qty;
      updateInSheet('Items', item.id, { current_stock: stockAfter });

      // อัพเดต Withdrawal
      var now = new Date().toISOString();
      updateInSheet('Withdrawals', wdId, {
        status: 'approved',
        quantity_approved: qty,
        approved_by: session.user_id,
        approved_by_name: session.name,
        approved_at: now
      });

      // บันทึก Transaction
      saveToSheet('Transactions', {
        id: Utilities.getUuid(),
        type: 'withdraw',
        item_id: item.id,
        item_name: item.name,
        item_code: item.item_code,
        quantity: qty,
        stock_before: stockBefore,
        stock_after: stockAfter,
        ref_id: wd.withdraw_no,
        actor_id: wd.requested_by,
        actor_name: wd.requested_by_name,
        actor_role: 'withdraw',
        approved_by_name: session.name,
        note: wd.note || '',
        date: now.split('T')[0]
      });

      // แจ้งเตือน stock ต่ำ
      var cfg = getConfig();
      var threshold = cfg.low_stock_threshold || CONFIG.LOW_STOCK_DEFAULT;
      var lowMsg = '';
      if (stockAfter <= (item.min_stock || threshold)) {
        lowMsg = '\n<b>คำเตือน: สต็อกต่ำกว่าขั้นต่ำ</b> เหลือ ' + stockAfter + ' ' + item.unit + ' (ขั้นต่ำ: ' + item.min_stock + ')';
      }

      var msg = '<b>อนุมัติการเบิก</b> #' + wd.withdraw_no
        + '\nรายการ: ' + item.name
        + '\nอนุมัติ: ' + qty + ' ' + item.unit
        + '\nผู้เบิก: ' + wd.requested_by_name
        + '\nสต็อกคงเหลือ: ' + stockAfter + ' ' + item.unit
        + '\nอนุมัติโดย: ' + session.name
        + lowMsg;
      sendTelegram(msg);

      return { success: true, message: 'อนุมัติการเบิกเรียบร้อย' };
    } finally { lock.releaseLock(); }
  } catch(err) {
    logError('approveWithdrawal', err);
    return { success: false, message: err.message };
  }
}

/** rejectWithdrawal — ปฏิเสธการเบิก (Admin เท่านั้น) */
function rejectWithdrawal(token, wdId, reason) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var wds = getSheetData('Withdrawals');
    var wd = null;
    for (var i = 0; i < wds.length; i++) {
      if (wds[i].id === wdId) { wd = wds[i]; break; }
    }
    if (!wd || wd.status !== 'pending') return { success: false, message: 'ไม่พบคำขอหรือดำเนินการแล้ว' };
    updateInSheet('Withdrawals', wdId, {
      status: 'rejected',
      approved_by: session.user_id,
      approved_by_name: session.name,
      approved_at: new Date().toISOString(),
      reject_reason: reason || ''
    });
    sendTelegram('<b>ปฏิเสธการเบิก</b> #' + wd.withdraw_no
      + '\nรายการ: ' + wd.item_name
      + '\nผู้ขอ: ' + wd.requested_by_name
      + '\nเหตุผล: ' + (reason || '-')
      + '\nโดย: ' + session.name);
    return { success: true, message: 'ปฏิเสธคำขอเรียบร้อย' };
  } catch(err) {
    logError('rejectWithdrawal', err);
    return { success: false, message: err.message };
  }
}

// ============================================================
// TRANSACTIONS + DASHBOARD
// ============================================================

/** getTransactions — ดึงประวัติ transaction */
function getTransactions(token, filters) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var data = getSheetData('Transactions');
    if (session.role === 'employee') {
      data = data.filter(function(t){ return t.actor_id === session.user_id; });
    }
    if (filters) {
      if (filters.type && filters.type !== 'all') data = data.filter(function(t){ return t.type === filters.type; });
      if (filters.date_from) data = data.filter(function(t){ return (t.date||'') >= filters.date_from; });
      if (filters.date_to)   data = data.filter(function(t){ return (t.date||'') <= filters.date_to; });
    }
    data.sort(function(a,b){ return b.created_at > a.created_at ? 1 : -1; });
    return { success: true, data: data };
  } catch(err) { return { success: false, message: err.message }; }
}

/** getDashboardStats — ข้อมูล Dashboard */
function getDashboardStats(token) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };

    var items = getSheetData('Items').filter(function(i){ return i.active !== false; });
    var wds   = getSheetData('Withdrawals');
    var txs   = getSheetData('Transactions');
    var today = new Date().toISOString().split('T')[0];
    var cfg   = getConfig();
    var threshold = cfg.low_stock_threshold || CONFIG.LOW_STOCK_DEFAULT;

    // KPI
    var totalItems = items.length;
    var lowStockItems = items.filter(function(i){ return (i.current_stock||0) <= (i.min_stock || threshold); });
    var pendingWds = wds.filter(function(w){ return w.status === 'pending'; });
    var todayTxs  = txs.filter(function(t){ return t.date === today; });

    // กราฟรายเดือน (6 เดือนล่าสุด)
    var monthlyData = {};
    var now = new Date();
    for (var m = 5; m >= 0; m--) {
      var d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0');
      monthlyData[key] = { receive: 0, withdraw: 0, label: (d.getMonth() + 1) + '/' + (d.getFullYear() + 543) };
    }
    txs.forEach(function(t) {
      var key = (t.date || '').substring(0, 7);
      if (monthlyData[key]) {
        if (t.type === 'receive')  monthlyData[key].receive  += t.quantity || 0;
        if (t.type === 'withdraw') monthlyData[key].withdraw += t.quantity || 0;
      }
    });

    // Top 5 วัสดุที่เบิกมากสุด
    var withdrawByItem = {};
    wds.filter(function(w){ return w.status === 'approved'; }).forEach(function(w) {
      withdrawByItem[w.item_name] = (withdrawByItem[w.item_name] || 0) + (w.quantity_approved || 0);
    });
    var topItems = Object.keys(withdrawByItem)
      .map(function(k){ return { name: k, qty: withdrawByItem[k] }; })
      .sort(function(a,b){ return b.qty - a.qty; })
      .slice(0, 5);

    // สต็อกแต่ละหมวด
    var categoryStock = {};
    items.forEach(function(i) {
      var cat = i.category || 'อื่นๆ';
      categoryStock[cat] = (categoryStock[cat] || 0) + 1;
    });

    // ล่าสุด
    var recentTxs = txs.slice().sort(function(a,b){ return b.created_at > a.created_at ? 1 : -1; }).slice(0, 10);
    var recentPending = wds.filter(function(w){ return w.status === 'pending'; })
      .sort(function(a,b){ return b.requested_at > a.requested_at ? 1 : -1; }).slice(0, 5);

    return {
      success: true,
      kpi: {
        total_items: totalItems,
        low_stock: lowStockItems.length,
        pending: pendingWds.length,
        today_tx: todayTxs.length
      },
      monthly: Object.values(monthlyData),
      top_items: topItems,
      category_stock: categoryStock,
      low_stock_items: lowStockItems.slice(0, 5),
      recent_transactions: recentTxs,
      recent_pending: recentPending
    };
  } catch(err) {
    logError('getDashboardStats', err);
    return { success: false, message: err.message };
  }
}

// ============================================================
// USERS (จัดการผู้ใช้ — Admin)
// ============================================================

/** getUsers — ดึงรายชื่อผู้ใช้ทั้งหมด */
function getUsers(token) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var users = getSheetData('Users').map(function(u) {
      return { id:u.id, username:u.username, name:u.name, role:u.role, email:u.email, phone:u.phone||'', active:u.active, last_login:u.last_login||'', avatar:u.avatar||'' };
    });
    return { success: true, data: users };
  } catch(err) { return { success: false, message: err.message }; }
}

/** addUser — เพิ่มผู้ใช้ใหม่ */
function addUser(token, userData) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var existing = getSheetData('Users');
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].username === userData.username) return { success: false, message: 'Username นี้มีในระบบแล้ว' };
    }
    saveToSheet('Users', {
      id: Utilities.getUuid(),
      username: userData.username,
      password: hashPassword(userData.password),
      role: userData.role,
      name: userData.name,
      email: userData.email || '',
      phone: userData.phone || '',
      avatar: '',
      telegram_chat_id: '',
      active: true,
      last_login: ''
    });
    return { success: true, message: 'เพิ่มผู้ใช้เรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

/** updateUser — แก้ไขข้อมูลผู้ใช้ */
function updateUser(token, userId, userData) {
  try {
    var session = validateSession(token);
    if (!session || (session.role !== 'admin' && session.user_id !== userId)) {
      return { success: false, message: 'ไม่มีสิทธิ์' };
    }
    var update = { name: userData.name, email: userData.email, phone: userData.phone };
    if (session.role === 'admin') { update.role = userData.role; update.active = userData.active; }
    if (userData.avatar) update.avatar = userData.avatar;
    updateInSheet('Users', userId, update);
    return { success: true, message: 'แก้ไขข้อมูลเรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

/** changePassword — เปลี่ยนรหัสผ่าน */
function changePassword(token, oldPass, newPass) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var users = getSheetData('Users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === session.user_id) { user = users[i]; break; }
    }
    if (!user || !verifyPassword(oldPass, user.password)) {
      return { success: false, message: 'รหัสผ่านเดิมไม่ถูกต้อง' };
    }
    updateInSheet('Users', user.id, { password: hashPassword(newPass) });
    return { success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

/** resetUserPassword — Admin reset password ผู้ใช้ */
function resetUserPassword(token, userId) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var users = getSheetData('Users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === userId) { user = users[i]; break; }
    }
    if (!user) return { success: false, message: 'ไม่พบผู้ใช้' };
    var tmpPass = Math.random().toString(36).slice(-8).toUpperCase();
    updateInSheet('Users', userId, { password: hashPassword(tmpPass) });
    if (user.email) {
      var cfg = getConfig();
      MailApp.sendEmail({ to: user.email, subject: 'Reset รหัสผ่าน — ' + cfg.app_name,
        htmlBody: '<p>รหัสผ่านชั่วคราว: <b>' + tmpPass + '</b></p><p>กรุณาเปลี่ยนรหัสผ่านหลัง Login</p>' });
    }
    return { success: true, message: 'Reset password เรียบร้อย' + (user.email ? ' ส่งทางอีเมลแล้ว' : ': ' + tmpPass) };
  } catch(err) { return { success: false, message: err.message }; }
}

/** toggleUserActive — เปิด/ปิดบัญชีผู้ใช้ */
function toggleUserActive(token, userId) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var users = getSheetData('Users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === userId) { user = users[i]; break; }
    }
    if (!user) return { success: false, message: 'ไม่พบผู้ใช้' };
    updateInSheet('Users', userId, { active: !user.active });
    return { success: true, message: (!user.active ? 'เปิด' : 'ระงับ') + 'บัญชีเรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

// ============================================================
// CONFIG & SETTINGS
// ============================================================

/** saveConfig — บันทึกการตั้งค่าระบบ */
function saveConfig(token, configData) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var configs = getSheetData('Config');
    if (configs.length > 0) {
      updateInSheet('Config', configs[0].id, configData);
    } else {
      saveToSheet('Config', configData);
    }
    return { success: true, message: 'บันทึกการตั้งค่าเรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

// ============================================================
// REPORTS + EXPORT
// ============================================================

/** getMonthlyReport — รายงานสรุปรายเดือน (แบบ Excel เดิม) */
function getMonthlyReport(token, year, month) {
  try {
    var session = validateSession(token);
    if (!session || session.role === 'employee') return { success: false, message: 'ไม่มีสิทธิ์' };
    var dateStr = year + '-' + String(month).padStart(2, '0');
    var items = getSheetData('Items').filter(function(i){ return i.active !== false; });
    var txs   = getSheetData('Transactions');

    var rows = items.map(function(item) {
      // เบิกแต่ละวัน 1-31
      var daily = {};
      for (var d = 1; d <= 31; d++) daily[d] = 0;
      txs.forEach(function(t) {
        if (t.type === 'withdraw' && t.item_id === item.id && (t.date||'').startsWith(dateStr)) {
          var day = parseInt(t.date.split('-')[2]);
          if (day) daily[day] += t.quantity || 0;
        }
      });
      var totalWithdraw = Object.values(daily).reduce(function(a,b){ return a+b; }, 0);
      var received = txs.filter(function(t){
        return t.type === 'receive' && t.item_id === item.id && (t.date||'').startsWith(dateStr);
      }).reduce(function(s,t){ return s + (t.quantity||0); }, 0);
      return {
        item_code: item.item_code, name: item.name, size: item.size, unit: item.unit,
        current_stock: item.current_stock, received: received,
        daily: daily, total_withdraw: totalWithdraw
      };
    });
    return { success: true, data: rows, month: dateStr };
  } catch(err) { return { success: false, message: err.message }; }
}

/** generateExportUrl — สร้าง Spreadsheet ชั่วคราวสำหรับ Export */
function generateExportUrl(token, reportType, filters) {
  try {
    var session = validateSession(token);
    if (!session || session.role === 'employee') return { success: false, message: 'ไม่มีสิทธิ์' };

    var ss = SpreadsheetApp.create('Export_' + reportType + '_' + new Date().getTime());
    var sheet = ss.getActiveSheet();

    if (reportType === 'receives') {
      sheet.setName('รายงานรับเข้า');
      sheet.appendRow(['เลขที่รับ','วันที่','รหัสวัสดุ','ชื่อวัสดุ','จำนวน','หน่วย','ผู้รับ','หมายเหตุ']);
      var recvs = getSheetData('Receives');
      if (filters && filters.date_from) recvs = recvs.filter(function(r){ return r.date >= filters.date_from; });
      if (filters && filters.date_to)   recvs = recvs.filter(function(r){ return r.date <= filters.date_to; });
      recvs.forEach(function(r){
        sheet.appendRow([r.receive_no, r.date, r.item_code, r.item_name, r.quantity, r.unit, r.received_by_name, r.note||'']);
      });
    } else if (reportType === 'withdrawals') {
      sheet.setName('รายงานเบิกออก');
      sheet.appendRow(['เลขที่เบิก','วันที่','รหัสวัสดุ','ชื่อวัสดุ','ขอ','อนุมัติ','หน่วย','ผู้เบิก','วัตถุประสงค์','สถานะ']);
      var wds = getSheetData('Withdrawals');
      if (filters && filters.status && filters.status !== 'all') wds = wds.filter(function(w){ return w.status === filters.status; });
      wds.forEach(function(w){
        sheet.appendRow([w.withdraw_no, w.requested_at.split('T')[0], w.item_code, w.item_name,
          w.quantity_requested, w.quantity_approved, w.unit, w.requested_by_name, w.purpose||'', w.status]);
      });
    }

    var url = ss.getUrl();
    // ย้ายไป Drive ชั่วคราว — ลบหลัง 1h
    DriveApp.getFileById(ss.getId()).setTrashed(false);
    return { success: true, url: url };
  } catch(err) {
    logError('generateExportUrl', err);
    return { success: false, message: err.message };
  }
}

// ============================================================
// FILE UPLOAD (Google Drive)
// ============================================================

/** uploadFile — อัปโหลดไฟล์ไปยัง Google Drive */
function uploadFile(token, base64Data, mimeType, filename) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var cfg = getConfig();
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, filename);
    var file;
    if (cfg.folder_id) {
      var folder = DriveApp.getFolderById(cfg.folder_id);
      file = folder.createFile(blob);
    } else {
      file = DriveApp.createFile(blob);
    }
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileId = file.getId();
    return { success: true, file_id: fileId, url: 'https://lh5.googleusercontent.com/d/' + fileId };
  } catch(err) {
    logError('uploadFile', err);
    return { success: false, message: err.message };
  }
}

// ============================================================
// TELEGRAM
// ============================================================

/** sendTelegram — ส่งข้อความแจ้งเตือนผ่าน Telegram Bot */
function sendTelegram(message) {
  try {
    var cfg = getConfig();
    if (!cfg.telegram_enabled || !cfg.telegram_bot_token || !cfg.telegram_chat_id) return;
    var url = 'https://api.telegram.org/bot' + cfg.telegram_bot_token + '/sendMessage';
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: cfg.telegram_chat_id, text: message, parse_mode: 'HTML' }),
      muteHttpExceptions: true
    });
  } catch(err) { console.error('Telegram error:', err); }
}

/** testTelegram — ทดสอบการส่ง Telegram */
function testTelegram(token) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    sendTelegram('<b>ทดสอบการแจ้งเตือน</b>\nระบบวัสดุสิ้นเปลืองทำงานปกติ\nเวลา: ' + new Date().toLocaleString('th-TH'));
    return { success: true, message: 'ส่งข้อความทดสอบแล้ว' };
  } catch(err) { return { success: false, message: err.message }; }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/** getSheetData — อ่านข้อมูลทั้งหมดจาก Sheet */
function getSheetData(sheetName) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues()
      .filter(function(r){ return r[0] && r[0] !== ''; })
      .map(function(r){ try { return JSON.parse(r[0]); } catch(e){ return null; } })
      .filter(function(i){ return i !== null; });
  } catch(err) { logError('getSheetData:' + sheetName, err); return []; }
}

/** saveToSheet — เพิ่มข้อมูลใหม่ */
function saveToSheet(sheetName, data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!data.id) data.id = Utilities.getUuid();
  if (!data.created_at) data.created_at = new Date().toISOString();
  data.updated_at = new Date().toISOString();
  sheet.appendRow([JSON.stringify(data)]);
  return data;
}

/** updateInSheet — อัพเดตข้อมูลตาม id */
function updateInSheet(sheetName, id, updates) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var rows = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < rows.length; i++) {
    try {
      var obj = JSON.parse(rows[i][0]);
      if (obj.id === id) {
        Object.keys(updates).forEach(function(k){ obj[k] = updates[k]; });
        obj.updated_at = new Date().toISOString();
        sheet.getRange(i + 2, 1).setValue(JSON.stringify(obj));
        return obj;
      }
    } catch(e){}
  }
  return null;
}

/** deleteFromSheet — ลบแถว (hard delete) */
function deleteFromSheet(sheetName, id, hard) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var rows = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  for (var i = rows.length - 1; i >= 0; i--) {
    try {
      var obj = JSON.parse(rows[i][0]);
      if (obj.id === id) {
        if (hard) { sheet.deleteRow(i + 2); }
        else { obj.active = false; obj.updated_at = new Date().toISOString(); sheet.getRange(i + 2, 1).setValue(JSON.stringify(obj)); }
        return true;
      }
    } catch(e){}
  }
  return false;
}

/** getConfig — อ่าน Config */
function getConfig() {
  var c = getSheetData('Config');
  return c.length > 0 ? c[0] : { app_name: CONFIG.APP_NAME };
}

/** generateRunningNumber — สร้างเลขที่อัตโนมัติ */
function generateRunningNumber(prefix, sheetName) {
  var count = getSheetData(sheetName).length + 1;
  var thaiYear = new Date().getFullYear() + 543;
  return prefix + '-' + thaiYear + '-' + String(count).padStart(4, '0');
}

/** hashPassword — เข้ารหัส SHA-256 */
function hashPassword(password) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + CONFIG.SALT,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b){ return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

/** verifyPassword — ตรวจสอบรหัสผ่าน */
function verifyPassword(plain, hashed) {
  return hashPassword(plain) === hashed;
}

/** logError — บันทึก error */
function logError(fnName, err) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Errors');
    if (!sheet) return;
    var data = { id: Utilities.getUuid(), function_name: fnName,
      error_message: err.message || String(err), stack_trace: err.stack || '',
      created_at: new Date().toISOString() };
    sheet.appendRow([JSON.stringify(data)]);
    console.error('[' + fnName + ']', err);
  } catch(e){}
}
