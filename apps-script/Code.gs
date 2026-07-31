var SHEET_NAME = 'Downloads';

function doPost(e) {
  var output = {};
  try {
    var body = JSON.parse(e.postData.contents || '{}');

    var secret = PropertiesService.getScriptProperties().getProperty('SHEETS_SECRET');
    if (!secret) {
      return respond({ ok: false, error: 'SHEETS_SECRET script property not set' }, 500);
    }
    if (body.secret !== secret) {
      return respond({ ok: false, error: 'Unauthorized' }, 403);
    }

    var sheet = getOrCreateSheet();
    var timestamp = body.timestamp || new Date().toISOString();
    sheet.appendRow([
      timestamp,
      body.version || '',
      body.country || '',
      body.browser || '',
      body.os || '',
      body.userAgent || '',
      body.referrer || ''
    ]);

    var total = getDownloadCount(sheet);
    return respond({ ok: true, total: total }, 200);
  } catch (err) {
    return respond({ ok: false, error: String(err) }, 500);
  }
}

function getOrCreateSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(['Timestamp', 'Plugin Version', 'Country', 'Browser', 'OS', 'User Agent', 'Referrer']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getDownloadCount(sheet) {
  var lastRow = sheet.getLastRow();
  return Math.max(lastRow - 1, 0);
}

function respond(payload, status) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
