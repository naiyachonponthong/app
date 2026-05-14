// ============================================================
// API Client — Google Apps Script Backend
// ============================================================

var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxRwxGGW3fxIB0rKRIU2zh9lEo_yUTVEcW6cWAqMF4YYJBvu0YxCXfy6mUbj8ihTyaRXQ/exec';

function callAPI(fnName) {
  var args = Array.prototype.slice.call(arguments, 1);
  var url = APPS_SCRIPT_URL + '?fn=' + encodeURIComponent(fnName) + '&args=' + encodeURIComponent(JSON.stringify(args));

  return fetch(url, { method: 'GET' }).then(function(res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).catch(function(err) {
    console.error('API Error [' + fnName + ']:', err);
    throw err;
  });
}

// Helper: แปลง file_id เป็น URL สำหรับแสดงรูป
function getFileDataUrl(fileId) {
  if (!fileId) return '';
  if (String(fileId).indexOf('http') === 0) return fileId;
  return 'https://lh5.googleusercontent.com/d/' + fileId;
}
