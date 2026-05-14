// ============================================================
// Mock Backend API (localStorage)
// ============================================================

const CONFIG = {
  APP_NAME: 'ระบบวัสดุสิ้นเปลือง',
  APP_VERSION: '1.0',
  SESSION_TIMEOUT: 28800,
  ITEMS_PER_PAGE: 20,
  LOW_STOCK_DEFAULT: 5,
  SALT: 'SUP_SYS_2569_SALT',
  ADMIN_USERS: {
    'admin':   { password: 'admin1234',  role: 'admin',    name: 'ผู้ดูแลระบบ',  email: 'admin@school.ac.th' },
    'staff01': { password: 'staff1234',  role: 'staff',    name: 'เจ้าหน้าที่คลัง', email: 'staff@school.ac.th' },
    'emp01':   { password: 'emp1234',    role: 'employee', name: 'พนักงาน 01',   email: 'emp@school.ac.th' }
  },
  USER_ROLES: {
    'admin':    { name: 'ผู้ดูแลระบบ',    permissions: ['all'] },
    'staff':    { name: 'เจ้าหน้าที่คลัง', permissions: ['view','receive','withdraw','report'] },
    'employee': { name: 'พนักงาน',        permissions: ['view_own','withdraw'] }
  }
};

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

// ===== HELPERS =====
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => ('0' + b.toString(16)).slice(-2)).join('');
}

async function hashPassword(password) {
  return await sha256(password + CONFIG.SALT);
}

async function verifyPassword(plain, hashed) {
  return await hashPassword(plain) === hashed;
}

function generateRunningNumber(prefix, sheetName) {
  var count = getSheetData(sheetName).length + 1;
  var thaiYear = new Date().getFullYear() + 543;
  return prefix + '-' + thaiYear + '-' + String(count).padStart(4, '0');
}

// ===== LOCALSTORAGE DB =====
function dbKey(name) { return 'sup_db_' + name; }

function getSheetData(sheetName) {
  try {
    var raw = localStorage.getItem(dbKey(sheetName));
    if (!raw) return [];
    return JSON.parse(raw).filter(function(i){ return i !== null; });
  } catch(e) { console.error(e); return []; }
}

function saveToSheet(sheetName, data) {
  var arr = getSheetData(sheetName);
  if (!data.id) data.id = uuid();
  if (!data.created_at) data.created_at = new Date().toISOString();
  data.updated_at = new Date().toISOString();
  arr.push(data);
  localStorage.setItem(dbKey(sheetName), JSON.stringify(arr));
  return data;
}

function updateInSheet(sheetName, id, updates) {
  var arr = getSheetData(sheetName);
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].id === id) {
      Object.keys(updates).forEach(function(k){ arr[i][k] = updates[k]; });
      arr[i].updated_at = new Date().toISOString();
      localStorage.setItem(dbKey(sheetName), JSON.stringify(arr));
      return arr[i];
    }
  }
  return null;
}

function deleteFromSheet(sheetName, id, hard) {
  var arr = getSheetData(sheetName);
  for (var i = arr.length - 1; i >= 0; i--) {
    if (arr[i].id === id) {
      if (hard) { arr.splice(i, 1); }
      else { arr[i].active = false; arr[i].updated_at = new Date().toISOString(); }
      localStorage.setItem(dbKey(sheetName), JSON.stringify(arr));
      return true;
    }
  }
  return false;
}

// ===== INITIALIZE =====
function initializeSheets() {
  var sheets = ['Config','Users','Sessions','Items','Receives','Withdrawals','Transactions','Errors'];
  sheets.forEach(function(name) {
    if (!localStorage.getItem(dbKey(name))) {
      localStorage.setItem(dbKey(name), '[]');
    }
  });

  // Seed Config
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

  // Seed Users
  if (getSheetData('Users').length === 0) {
    Object.keys(CONFIG.ADMIN_USERS).forEach(function(username) {
      var u = CONFIG.ADMIN_USERS[username];
      var pw = sha256(u.password + CONFIG.SALT); // async but we need sync here for seed; use simple hash
      // Since sha256 is async, we can't use it in forEach directly for seeding
      // We'll seed with plaintext and hash on login check
      saveToSheet('Users', {
        id: uuid(),
        username: username,
        password: u.password, // will be hashed on first login
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

  // Seed Items
  if (getSheetData('Items').length === 0) {
    var year = new Date().getFullYear();
    SEED_ITEMS.forEach(function(item, idx) {
      var code = 'SUP-' + String(idx + 1).padStart(3, '0');
      saveToSheet('Items', {
        id: uuid(),
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

  return { status: 'success', message: 'DB พร้อมใช้งาน' };
}

// ===== AUTH =====
async function login(username, password, role) {
  try {
    var users = getSheetData('Users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].username === username && users[i].active) { user = users[i]; break; }
    }
    if (!user) return { success: false, message: 'ไม่พบชื่อผู้ใช้งานในระบบ' };
    
    // Check if password is hashed
    var isHashed = user.password.length === 64;
    var passMatch = false;
    if (isHashed) {
      passMatch = await verifyPassword(password, user.password);
    } else {
      passMatch = user.password === password;
      if (passMatch) {
        // Hash it for next time
        user.password = await hashPassword(password);
        updateInSheet('Users', user.id, { password: user.password });
      }
    }
    
    if (!passMatch) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
    if (role && user.role !== role) return { success: false, message: 'บทบาทไม่ถูกต้อง กรุณาเลือกแท็บให้ตรง' };

    var token = uuid();
    var now = new Date();
    saveToSheet('Sessions', {
      id: uuid(),
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
    console.error(err);
    return { success: false, message: 'เกิดข้อผิดพลาดในระบบ' };
  }
}

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

function logout(token) {
  try {
    var sessions = getSheetData('Sessions');
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].token === token) { deleteFromSheet('Sessions', sessions[i].id, true); break; }
    }
    return { success: true };
  } catch(err) { return { success: false }; }
}

function forgotPassword(email) {
  try {
    var users = getSheetData('Users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === email && users[i].active) { user = users[i]; break; }
    }
    if (!user) return { success: false, message: 'ไม่พบอีเมลนี้ในระบบ' };
    var tmpPass = Math.random().toString(36).slice(-8).toUpperCase();
    hashPassword(tmpPass).then(function(hashed) {
      updateInSheet('Users', user.id, { password: hashed });
    });
    console.log('Temporary password for', email, ':', tmpPass);
    return { success: true, message: 'รหัสผ่านชั่วคราว: ' + tmpPass + ' (ดูใน Console)' };
  } catch(err) {
    console.error(err);
    return { success: false, message: 'เกิดข้อผิดพลาด' };
  }
}

// ===== ITEMS =====
function getItems(token) {
  try {
    if (!validateSession(token)) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var items = getSheetData('Items').filter(function(i){ return i.active !== false; });
    items.sort(function(a,b){ return (a.item_code||'').localeCompare(b.item_code||''); });
    return { success: true, data: items };
  } catch(err) {
    console.error(err);
    return { success: false, message: err.message };
  }
}

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

function addItem(token, itemData) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
    var items = getSheetData('Items');
    var code = 'SUP-' + String(items.length + 1).padStart(3, '0');
    var newItem = {
      id: uuid(),
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
    console.error(err);
    return { success: false, message: err.message };
  }
}

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
    console.error(err);
    return { success: false, message: err.message };
  }
}

function deleteItem(token, itemId) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
    updateInSheet('Items', itemId, { active: false });
    return { success: true, message: 'ลบรายการเรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

// ===== RECEIVES =====
function addReceive(token, receiveData) {
  try {
    var session = validateSession(token);
    if (!session || session.role === 'employee') return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
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
    updateInSheet('Items', item.id, { current_stock: stockAfter });

    var recNo = generateRunningNumber('RCV', 'Receives');
    var rec = {
      id: uuid(),
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

    saveToSheet('Transactions', {
      id: uuid(),
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

    return { success: true, message: 'บันทึกรับเข้าเรียบร้อย', receive_no: recNo };
  } catch(err) {
    console.error(err);
    return { success: false, message: err.message };
  }
}

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

// ===== WITHDRAWALS =====
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
      id: uuid(),
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

    return { success: true, message: 'ยื่นคำขอเบิกเรียบร้อย รอการอนุมัติ', withdraw_no: wdNo };
  } catch(err) {
    console.error(err);
    return { success: false, message: err.message };
  }
}

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

function approveWithdrawal(token, wdId, qtyApproved) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์อนุมัติ' };

    var wds = getSheetData('Withdrawals');
    var wd = null;
    for (var i = 0; i < wds.length; i++) {
      if (wds[i].id === wdId) { wd = wds[i]; break; }
    }
    if (!wd) return { success: false, message: 'ไม่พบคำขอเบิก' };
    if (wd.status !== 'pending') return { success: false, message: 'คำขอนี้ดำเนินการแล้ว' };

    var qty = parseInt(qtyApproved) || wd.quantity_requested;

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

    var now = new Date().toISOString();
    updateInSheet('Withdrawals', wdId, {
      status: 'approved',
      quantity_approved: qty,
      approved_by: session.user_id,
      approved_by_name: session.name,
      approved_at: now
    });

    saveToSheet('Transactions', {
      id: uuid(),
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

    return { success: true, message: 'อนุมัติการเบิกเรียบร้อย' };
  } catch(err) {
    console.error(err);
    return { success: false, message: err.message };
  }
}

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
    return { success: true, message: 'ปฏิเสธคำขอเรียบร้อย' };
  } catch(err) {
    console.error(err);
    return { success: false, message: err.message };
  }
}

// ===== TRANSACTIONS =====
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

// ===== DASHBOARD =====
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

    var totalItems = items.length;
    var lowStockItems = items.filter(function(i){ return (i.current_stock||0) <= (i.min_stock || threshold); });
    var pendingWds = wds.filter(function(w){ return w.status === 'pending'; });
    var todayTxs  = txs.filter(function(t){ return t.date === today; });

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

    var withdrawByItem = {};
    wds.filter(function(w){ return w.status === 'approved'; }).forEach(function(w) {
      withdrawByItem[w.item_name] = (withdrawByItem[w.item_name] || 0) + (w.quantity_approved || 0);
    });
    var topItems = Object.keys(withdrawByItem)
      .map(function(k){ return { name: k, qty: withdrawByItem[k] }; })
      .sort(function(a,b){ return b.qty - a.qty; })
      .slice(0, 5);

    var categoryStock = {};
    items.forEach(function(i) {
      var cat = i.category || 'อื่นๆ';
      categoryStock[cat] = (categoryStock[cat] || 0) + 1;
    });

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
    console.error(err);
    return { success: false, message: err.message };
  }
}

// ===== USERS =====
function getUsers(token) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var users = getSheetData('Users').map(function(u) {
      return { id:u.id, username:u.username, name:u.name, role:u.role, email:u.email||'', phone:u.phone||'', active:u.active, last_login:u.last_login||'', avatar:u.avatar||'' };
    });
    return { success: true, data: users };
  } catch(err) { return { success: false, message: err.message }; }
}

function addUser(token, userData) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var existing = getSheetData('Users');
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].username === userData.username) return { success: false, message: 'Username นี้มีในระบบแล้ว' };
    }
    hashPassword(userData.password).then(function(hashed) {
      saveToSheet('Users', {
        id: uuid(),
        username: userData.username,
        password: hashed,
        role: userData.role,
        name: userData.name,
        email: userData.email || '',
        phone: userData.phone || '',
        avatar: '',
        telegram_chat_id: '',
        active: true,
        last_login: ''
      });
    });
    return { success: true, message: 'เพิ่มผู้ใช้เรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

function updateUser(token, userId, userData) {
  try {
    var session = validateSession(token);
    if (!session || (session.role !== 'admin' && session.user_id !== userId)) {
      return { success: false, message: 'ไม่มีสิทธิ์' };
    }
    var update = { name: userData.name, email: userData.email, phone: userData.phone };
    if (session.role === 'admin') { update.role = userData.role; if (userData.active !== undefined) update.active = userData.active; }
    if (userData.avatar) update.avatar = userData.avatar;
    updateInSheet('Users', userId, update);
    return { success: true, message: 'แก้ไขข้อมูลเรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

async function changePassword(token, oldPass, newPass) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var users = getSheetData('Users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === session.user_id) { user = users[i]; break; }
    }
    if (!user) return { success: false, message: 'ไม่พบผู้ใช้' };
    var isHashed = user.password.length === 64;
    var passMatch = false;
    if (isHashed) {
      passMatch = await verifyPassword(oldPass, user.password);
    } else {
      passMatch = user.password === oldPass;
    }
    if (!passMatch) return { success: false, message: 'รหัสผ่านเดิมไม่ถูกต้อง' };
    var newHash = await hashPassword(newPass);
    updateInSheet('Users', user.id, { password: newHash });
    return { success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

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
    hashPassword(tmpPass).then(function(hashed) {
      updateInSheet('Users', userId, { password: hashed });
    });
    return { success: true, message: 'Reset password เรียบร้อย: ' + tmpPass };
  } catch(err) { return { success: false, message: err.message }; }
}

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

// ===== CONFIG =====
function getConfig() {
  var c = getSheetData('Config');
  return c.length > 0 ? c[0] : { app_name: CONFIG.APP_NAME };
}

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

// ===== REPORTS =====
function getMonthlyReport(token, year, month) {
  try {
    var session = validateSession(token);
    if (!session || session.role === 'employee') return { success: false, message: 'ไม่มีสิทธิ์' };
    var dateStr = year + '-' + String(month).padStart(2, '0');
    var items = getSheetData('Items').filter(function(i){ return i.active !== false; });
    var txs   = getSheetData('Transactions');

    var rows = items.map(function(item) {
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
        daily: daily, total_withdraw: totalWithdraw, min_stock: item.min_stock
      };
    });
    return { success: true, data: rows, month: dateStr };
  } catch(err) { return { success: false, message: err.message }; }
}

function generateExportUrl(token, reportType, filters) {
  try {
    var session = validateSession(token);
    if (!session || session.role === 'employee') return { success: false, message: 'ไม่มีสิทธิ์' };
    // Static site can't generate real Excel; return CSV data URL instead
    var data = [];
    var csv = '';
    if (reportType === 'receives') {
      data = getSheetData('Receives');
      csv = 'เลขที่รับ,วันที่,รหัสวัสดุ,ชื่อวัสดุ,จำนวน,หน่วย,ผู้รับ,หมายเหตุ\n';
      data.forEach(function(r){
        csv += [r.receive_no, r.date, r.item_code, r.item_name, r.quantity, r.unit, r.received_by_name, r.note||''].join(',') + '\n';
      });
    } else if (reportType === 'withdrawals') {
      data = getSheetData('Withdrawals');
      csv = 'เลขที่เบิก,วันที่,รหัสวัสดุ,ชื่อวัสดุ,ขอ,อนุมัติ,หน่วย,ผู้เบิก,วัตถุประสงค์,สถานะ\n';
      data.forEach(function(w){
        csv += [w.withdraw_no, w.requested_at.split('T')[0], w.item_code, w.item_name, w.quantity_requested, w.quantity_approved, w.unit, w.requested_by_name, w.purpose||'', w.status].join(',') + '\n';
      });
    } else if (reportType === 'low_stock') {
      data = getSheetData('Items').filter(function(i){ return i.active !== false && i.current_stock <= i.min_stock; });
      csv = 'รหัส,ชื่อวัสดุ,คงเหลือ,ขั้นต่ำ\n';
      data.forEach(function(i){
        csv += [i.item_code, i.name, i.current_stock, i.min_stock].join(',') + '\n';
      });
    }
    var blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    return { success: true, url: url };
  } catch(err) {
    console.error(err);
    return { success: false, message: err.message };
  }
}

// ===== FILE UPLOAD =====
function uploadFile(token, base64Data, mimeType, filename) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    // Store base64 in localStorage with a unique ID
    var fileId = 'img_' + uuid();
    localStorage.setItem('sup_file_' + fileId, JSON.stringify({ base64: base64Data, mimeType: mimeType, filename: filename }));
    return { success: true, file_id: fileId, url: '' };
  } catch(err) {
    console.error(err);
    return { success: false, message: err.message };
  }
}

// Helper to get uploaded file as data URL
function getFileDataUrl(fileId) {
  try {
    var raw = localStorage.getItem('sup_file_' + fileId);
    if (!raw) return '';
    var f = JSON.parse(raw);
    return 'data:' + f.mimeType + ';base64,' + f.base64;
  } catch(e) { return ''; }
}

// ===== TELEGRAM =====
function sendTelegram(message) {
  var cfg = getConfig();
  if (!cfg.telegram_enabled || !cfg.telegram_bot_token || !cfg.telegram_chat_id) return;
  console.log('[Telegram]', message);
}

function testTelegram(token) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    sendTelegram('<b>ทดสอบการแจ้งเตือน</b>\nระบบวัสดุสิ้นเปลืองทำงานปกติ\nเวลา: ' + new Date().toLocaleString('th-TH'));
    return { success: true, message: 'ส่งข้อความทดสอบแล้ว (ดู Console)' };
  } catch(err) { return { success: false, message: err.message }; }
}

// ===== GLOBAL API WRAPPER =====
window.API = {
  initializeSheets, login, validateSession, logout, forgotPassword,
  getItems, getItemById, addItem, updateItem, deleteItem,
  addReceive, getReceives,
  addWithdrawal, getWithdrawals, approveWithdrawal, rejectWithdrawal,
  getTransactions, getDashboardStats,
  getUsers, addUser, updateUser, changePassword, resetUserPassword, toggleUserActive,
  getConfig, saveConfig,
  getMonthlyReport, generateExportUrl,
  uploadFile, testTelegram,
  getFileDataUrl
};

window.callAPI = function(fnName) {
  var args = Array.prototype.slice.call(arguments, 1);
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      try {
        var result = window.API[fnName].apply(null, args);
        Promise.resolve(result).then(resolve).catch(reject);
      } catch(e) {
        reject(e);
      }
    }, 100 + Math.random() * 200);
  });
};

// Init DB on load
initializeSheets();
