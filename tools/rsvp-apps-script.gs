/**
 * RSVP receiver for the Azaria & Melina wedding site.
 *
 * Deploy this as a Google Apps Script Web App bound to a Google Sheet. It
 * accepts POSTs from js/rsvp.js and upserts one row per guest, keyed on
 * (first + last + email) -- a repeat submission updates that guest's row
 * instead of adding a new one.
 *
 * The Sheet is never shared publicly. The Web App runs as you, so it can
 * write to your private Sheet; guests only ever reach this script, never the
 * Sheet itself.
 *
 * --- Setup ---------------------------------------------------------------
 * 1. Create a Google Sheet. Note its ID from the URL:
 *    https://docs.google.com/spreadsheets/d/1wZ90JySqQDHbop2_vScLlCdV686M4GhRopAk0Vy_vsA/edit
 * 2. Extensions > Apps Script. Delete the sample, paste this file.
 * 3. Set SHEET_ID below, and set SHARED_TOKEN to a long random string.
 * 4. Put the SAME token in TOKEN in js/rsvp.js.
 * 5. Deploy > New deployment > type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Copy the Web app URL (ends in /exec) into ENDPOINT in js/rsvp.js.
 * 6. Re-run "Deploy > Manage deployments > Edit > New version" whenever you
 *    change this script, or the old code keeps serving.
 *
 * To test without the site: Run > doGet (authorize when prompted), or use the
 * form. First run pops a permissions dialog -- approve it.
 */

var SHEET_ID = "1wZ90JySqQDHbop2_vScLlCdV686M4GhRopAk0Vy_vsA";
var SHEET_NAME = "RSVPs";
var SHARED_TOKEN = "da2e3146-52ef-42f6-aec8-adf0256bba9c-3cf7a0f9-6108-456a-9945-faa13f10243d"; // must match js/rsvp.js

var HEADERS = [
  "Updated",
  "First",
  "Last",
  "Email",
  "Phone",
  "Attending",
  "Events",
  "Party Size",
  "Notes"
];

function doPost(e) {
  // Serialize concurrent submissions so two writes can't collide.
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var p = (e && e.parameter) || {};

    if (p.token !== SHARED_TOKEN) {
      return json({ ok: false, error: "unauthorized" });
    }

    var first = normName(p.first);
    var last = normName(p.last);
    var email = normEmail(p.email);
    if (!first || !last || !email) {
      return json({ ok: false, error: "missing name or email" });
    }

    var sheet = getSheet();
    var key = rowKey(first, last, email);

    var row = [
      new Date(),
      first,
      last,
      email,
      String(p.phone || "").trim(),
      String(p.attending || "").trim(),
      String(p.events || "").trim(),
      String(p.party || "").trim(),
      String(p.notes || "").trim()
    ];

    var existing = findRowByKey(sheet, key);
    if (existing > 0) {
      sheet.getRange(existing, 1, 1, row.length).setValues([row]);
      return json({ ok: true, updated: true });
    }
    sheet.appendRow(row);
    return json({ ok: true, updated: false });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// A GET is handy for a quick "is it alive?" check in the browser.
function doGet() {
  return json({ ok: true, service: "rsvp", time: new Date().toISOString() });
}

function getSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  // Ensure a header row exists.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Match the client's normalization so keys line up: names uppercased,
// email lowercased, whitespace collapsed.
function normName(v) {
  return String(v || "").trim().replace(/\s+/g, " ").toUpperCase();
}
function normEmail(v) {
  return String(v || "").trim().toLowerCase();
}
function rowKey(first, last, email) {
  return first + " " + last + " " + email;
}

function findRowByKey(sheet, key) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  // Columns B,C,D = First, Last, Email.
  var values = sheet.getRange(2, 2, last - 1, 3).getValues();
  for (var i = 0; i < values.length; i++) {
    var k = rowKey(
      normName(values[i][0]),
      normName(values[i][1]),
      normEmail(values[i][2])
    );
    if (k === key) return i + 2; // sheet row number (1-based, +header)
  }
  return -1;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
