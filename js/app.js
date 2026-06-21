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

// Tracks whether the currently loaded Project ID already exists in the DB
let recordExists = false;

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
 * Returns the record object if found, or null if not found.
 */
async function getProjectByKey(projectId) {
  const payload = {
    cmd: "GET_BY_KEY",
    token: JPDB_CONFIG.TOKEN,
    dbName: JPDB_CONFIG.DB_NAME,
    relName: JPDB_CONFIG.REL_NAME,
    jsonStr: { "Project-ID": projectId }
  };

  const response = await fetch(jpdbUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // avoids CORS preflight - JPDB still parses body as JSON
    body: JSON.stringify(payload)
  });

  // JPDB returns a 400-style status when key is not found - that's expected,
  // not a real error, so we handle it gracefully below.
  const data = await response.json().catch(() => null);

  if (!data) return null;

  // JPDB's "not found" responses usually carry an error/message field
  if (data.error || data.errorCode || data.message === "No Records Found") {
    return null;
  }

  return data;
}

/**
 * PUT (insert) a brand-new record.
 */
async function insertProject(record) {
  const payload = {
    cmd: "PUT",
    token: JPDB_CONFIG.TOKEN,
    dbName: JPDB_CONFIG.DB_NAME,
    relName: JPDB_CONFIG.REL_NAME,
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
 * UPDATE an existing record (Project ID stays the same, other fields change).
 */
async function updateProject(record) {
  const payload = {
    cmd: "UPDATE",
    token: JPDB_CONFIG.TOKEN,
    dbName: JPDB_CONFIG.DB_NAME,
    relName: JPDB_CONFIG.REL_NAME,
    jsonStr: record
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

  projectIdInput.disabled = false;
  otherFields.forEach((field) => (field.disabled = true));

  saveBtn.disabled = true;
  updateBtn.disabled = true;
  resetBtn.disabled = true;

  clearMessage();
  projectIdInput.focus();
}

/**
 * Fill the form fields with data coming back from JPDB.
 * JPDB wraps the actual row inside different keys depending on version,
 * so we normalize here: try the most common shapes.
 */
function fillFormWithRecord(record) {
  // Most JPDB GET_BY_KEY responses put the row directly in the response,
  // sometimes nested under "data". We check both.
  const row = record.data || record;

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
      fillFormWithRecord(existing);

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

    if (result.error || result.errorCode) {
      showMessage("Save failed: " + (result.message || result.error), "error");
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

  const record = {
    "Project-ID": projectIdInput.value.trim(),
    "Project-Name": projectNameInput.value.trim(),
    "Assigned-To": assignedToInput.value.trim(),
    "Assignment-Date": assignmentDateInput.value,
    "Deadline": deadlineInput.value
  };

  try {
    showMessage("Updating...", "info");
    const result = await updateProject(record);

    if (result.error || result.errorCode) {
      showMessage("Update failed: " + (result.message || result.error), "error");
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