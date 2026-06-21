/* ===========================================================
   Project Management Form - Application Logic
   -----------------------------------------------------------
   Implements the workflow:
   1. On load / any button click -> empty form, cursor on
      Project ID field, all other fields & buttons disabled.
   2. User types Project ID:
        - If NOT found in DB -> enable Save + Reset,
          move focus to next field, let user fill rest.
        - If found in DB -> load that record into the form,
          disable Project ID, enable Update + Reset,
          move focus to next field.
   3. Save -> PUT new record. Update -> UPDATE existing record.
   4. Reset -> go back to step 1.
   =========================================================== */

// ---- Grab references to all form elements ----
const form = document.getElementById("projectForm");

const projectIdInput = document.getElementById("projectId");
const projectNameInput = document.getElementById("projectName");
const assignedToInput = document.getElementById("assignedTo");
const assignmentDateInput = document.getElementById("assignmentDate");
const deadlineInput = document.getElementById("deadline");

const saveBtn = document.getElementById("saveBtn");
const updateBtn = document.getElementById("updateBtn");
const resetBtn = document.getElementById("resetBtn");

const statusMessage = document.getElementById("statusMessage");

// Fields that are NOT the primary key (used for enabling/disabling + validation)
const otherFields = [projectNameInput, assignedToInput, assignmentDateInput, deadlineInput];

// Tracks whether the currently loaded Project ID already exists in the DB,
// and its JPDB record number (needed for UPDATE requests).
let recordExists = false;
let currentRecNo = null;

// ===========================================================
// JPDB API HELPER FUNCTIONS
// ===========================================================

/**
 * Build the JPDB API URL for data commands (PUT, UPDATE, GET_BY_KEY).
 */
function jpdbUrl() {
  return `${JPDB_CONFIG.BASE_URL}${JPDB_CONFIG.IML_ENDPOINT}`;
}

/**
 * GET_BY_KEY -> check if a Project ID already exists, and fetch its data.
 * Returns { recNo, row } if found, or null if not found.
 *
 * JPDB's actual success shape is:
 *   { "data": { "rec_no": 1, "record": { ...columns... } }, "message": "...", "status": 200 }
 * and its "not found" shape is:
 *   { "message": "...", "status": 400 }  (no "data" key, or status !== 200)
 */
async function getProjectByKey(projectId) {
  const payload = {
    cmd: "GET_BY_KEY",
    token: JPDB_CONFIG.TOKEN,
    dbName: JPDB_CONFIG.DB_NAME,
    rel: JPDB_CONFIG.REL_NAME, // NOTE: JPDB expects "rel", not "relName"
    jsonStr: { "Project-ID": projectId }
  };

  const response = await fetch(jpdbUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // avoids CORS preflight - JPDB still parses body as JSON
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => null);

  // Not found / error: JPDB returns status 400 (or no "data" key) in this case.
  if (!result || result.status !== 200 || !result.data || !result.data.record) {
    return null;
  }

  return {
    recNo: result.data.rec_no,
    row: result.data.record
  };
}

/**
 * PUT (insert) a brand-new record.
 */
async function insertProject(record) {
  const payload = {
    cmd: "PUT",
    token: JPDB_CONFIG.TOKEN,
    dbName: JPDB_CONFIG.DB_NAME,
    rel: JPDB_CONFIG.REL_NAME, // NOTE: JPDB expects "rel", not "relName"
    jsonStr: record
  };

  const response = await fetch(jpdbUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // avoids CORS preflight - JPDB still parses body as JSON
    body: JSON.stringify(payload)
  });

  return response.json();
}

/**
 * UPDATE an existing record.
 * JPDB's UPDATE command requires the record number as the jsonStr key,
 * mapping to only the columns that changed (Project-ID is the primary
 * key and is not part of the update payload).
 */
async function updateProject(recNo, changedFields) {
  const payload = {
    cmd: "UPDATE",
    token: JPDB_CONFIG.TOKEN,
    dbName: JPDB_CONFIG.DB_NAME,
    rel: JPDB_CONFIG.REL_NAME, // NOTE: JPDB expects "rel", not "relName"
    jsonStr: {
      [recNo]: changedFields
    }
  };

  const response = await fetch(jpdbUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // avoids CORS preflight - JPDB still parses body as JSON
    body: JSON.stringify(payload)
  });

  return response.json();
}

// ===========================================================
// UI STATE HELPERS
// ===========================================================

function showMessage(text, type) {
  statusMessage.textContent = text;
  statusMessage.className = "status-message " + (type || "");
}

function clearMessage() {
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
}

/**
 * Step 2: reset everything back to the initial empty-form state.
 */
function resetFormToStep2() {
  form.reset();
  recordExists = false;
  currentRecNo = null;

  projectIdInput.disabled = false;
  otherFields.forEach((field) => (field.disabled = true));

  saveBtn.disabled = true;
  updateBtn.disabled = true;
  resetBtn.disabled = true;

  clearMessage();
  projectIdInput.focus();
}

/**
 * Fill the form fields with a clean record row (as returned by
 * getProjectByKey's normalized "row" object).
 */
function fillFormWithRecord(row) {
  projectNameInput.value = row["Project-Name"] || "";
  assignedToInput.value = row["Assigned-To"] || "";
  assignmentDateInput.value = row["Assignment-Date"] || "";
  deadlineInput.value = row["Deadline"] || "";
}

/**
 * Simple "no empty fields" validation for the non-key fields.
 */
function validateOtherFields() {
  for (const field of otherFields) {
    if (!field.value || field.value.trim() === "") {
      showMessage(`Please fill in "${field.previousElementSibling.textContent.trim()}" - it cannot be empty.`, "error");
      field.focus();
      return false;
    }
  }
  return true;
}

// ===========================================================
// EVENT: typing / leaving the Project ID field
// ===========================================================

projectIdInput.addEventListener("blur", async () => {
  const projectId = projectIdInput.value.trim();

  if (projectId === "") return; // nothing to check yet

  showMessage("Checking database...", "info");

  try {
    const existing = await getProjectByKey(projectId);

    if (existing) {
      // ---- Record found: load it, switch to UPDATE mode ----
      recordExists = true;
      currentRecNo = existing.recNo;
      fillFormWithRecord(existing.row);

      projectIdInput.disabled = true; // primary key cannot change
      otherFields.forEach((field) => (field.disabled = false));

      saveBtn.disabled = true;
      updateBtn.disabled = false;
      resetBtn.disabled = false;

      showMessage("Existing project found. You can update its details.", "info");
      projectNameInput.focus();
    } else {
      // ---- Not found: switch to SAVE (new entry) mode ----
      recordExists = false;
      currentRecNo = null;

      otherFields.forEach((field) => {
        field.disabled = false;
        field.value = "";
      });

      saveBtn.disabled = false;
      updateBtn.disabled = true;
      resetBtn.disabled = false;

      showMessage("New Project ID. Fill in the details and click Save.", "info");
      projectNameInput.focus();
    }
  } catch (err) {
    console.error(err);
    showMessage("Could not reach JsonPowerDB. Check your config / internet connection.", "error");
  }
});

// ===========================================================
// EVENT: Save button (insert new record)
// ===========================================================

saveBtn.addEventListener("click", async () => {
  const projectId = projectIdInput.value.trim();

  if (projectId === "") {
    showMessage("Project ID cannot be empty.", "error");
    projectIdInput.focus();
    return;
  }

  if (!validateOtherFields()) return;

  const record = {
    "Project-ID": projectId,
    "Project-Name": projectNameInput.value.trim(),
    "Assigned-To": assignedToInput.value.trim(),
    "Assignment-Date": assignmentDateInput.value,
    "Deadline": deadlineInput.value
  };

  try {
    showMessage("Saving...", "info");
    const result = await insertProject(record);

    if (result.status !== 200) {
      showMessage("Save failed: " + (result.message || "Unknown error"), "error");
      return;
    }

    showMessage("Project saved successfully!", "success");
    setTimeout(resetFormToStep2, 900);
  } catch (err) {
    console.error(err);
    showMessage("Save failed. Check your connection / config.", "error");
  }
});

// ===========================================================
// EVENT: Update button (update existing record)
// ===========================================================

updateBtn.addEventListener("click", async () => {
  if (!validateOtherFields()) return;

  if (currentRecNo === null || currentRecNo === undefined) {
    showMessage("Could not determine which record to update. Try re-entering the Project ID.", "error");
    return;
  }

  // Only the non-key fields are sent - Project-ID is the primary key
  // and is not included in an UPDATE's jsonStr.
  const changedFields = {
    "Project-Name": projectNameInput.value.trim(),
    "Assigned-To": assignedToInput.value.trim(),
    "Assignment-Date": assignmentDateInput.value,
    "Deadline": deadlineInput.value
  };

  try {
    showMessage("Updating...", "info");
    const result = await updateProject(currentRecNo, changedFields);

    if (result.status !== 200) {
      showMessage("Update failed: " + (result.message || "Unknown error"), "error");
      return;
    }

    showMessage("Project updated successfully!", "success");
    setTimeout(resetFormToStep2, 900);
  } catch (err) {
    console.error(err);
    showMessage("Update failed. Check your connection / config.", "error");
  }
});

// ===========================================================
// EVENT: Reset button
// ===========================================================

resetBtn.addEventListener("click", resetFormToStep2);

// ===========================================================
// On page load -> Step 2 (empty form, cursor on Project ID)
// -----------------------------------------------------------
// Note: we no longer call ensureDatabaseAndRelation() here.
// JPDB's /api/irl endpoint blocks the browser's CORS preflight
// request, so that check can never succeed from client-side JS.
// Since COLLEGE-DB / PROJECT-TABLE were already created once
// manually (via the JPDB dashboard's Insert page), we skip
// straight to showing the form.
// ===========================================================

window.addEventListener("DOMContentLoaded", resetFormToStep2);