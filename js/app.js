
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

const otherFields = [projectNameInput, assignedToInput, assignmentDateInput, deadlineInput];

// Tracks whether the currently loaded Project ID already exists in the DB, and its JPDB record number (needed for UPDATE requests).
let recordExists = false;
let currentRecNo = null;


function jpdbUrl() {
  return `${JPDB_CONFIG.BASE_URL}${JPDB_CONFIG.IML_ENDPOINT}`;
}

async function getProjectByKey(projectId) {
  const payload = {
    cmd: "GET_BY_KEY",
    token: JPDB_CONFIG.TOKEN,
    dbName: JPDB_CONFIG.DB_NAME,
    rel: JPDB_CONFIG.REL_NAME, 
    jsonStr: { "Project-ID": projectId }
  };

  const response = await fetch(jpdbUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, 
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => null);

  if (!result || result.status !== 200 || !result.data || !result.data.record) {
    return null;
  }

  return {
    recNo: result.data.rec_no,
    row: result.data.record
  };
}

// PUT (insert) a brand-new record.
async function insertProject(record) {
  const payload = {
    cmd: "PUT",
    token: JPDB_CONFIG.TOKEN,
    dbName: JPDB_CONFIG.DB_NAME,
    rel: JPDB_CONFIG.REL_NAME, 
    jsonStr: record
  };

  const response = await fetch(jpdbUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, 
    body: JSON.stringify(payload)
  });

  return response.json();
}

async function updateProject(recNo, changedFields) {
  const payload = {
    cmd: "UPDATE",
    token: JPDB_CONFIG.TOKEN,
    dbName: JPDB_CONFIG.DB_NAME,
    rel: JPDB_CONFIG.REL_NAME, 
    jsonStr: {
      [recNo]: changedFields
    }
  };

  const response = await fetch(jpdbUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, 
    body: JSON.stringify(payload)
  });

  return response.json();
}

function showMessage(text, type) {
  statusMessage.textContent = text;
  statusMessage.className = "status-message " + (type || "");
}

function clearMessage() {
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
}

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

function fillFormWithRecord(row) {
  projectNameInput.value = row["Project-Name"] || "";
  assignedToInput.value = row["Assigned-To"] || "";
  assignmentDateInput.value = row["Assignment-Date"] || "";
  deadlineInput.value = row["Deadline"] || "";
}

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

projectIdInput.addEventListener("blur", async () => {
  const projectId = projectIdInput.value.trim();

  if (projectId === "") return; // nothing to check yet

  showMessage("Checking database...", "info");

  try {
    const existing = await getProjectByKey(projectId);

    if (existing) {
      recordExists = true;
      currentRecNo = existing.recNo;
      fillFormWithRecord(existing.row);

      projectIdInput.disabled = true; 
      otherFields.forEach((field) => (field.disabled = false));

      saveBtn.disabled = true;
      updateBtn.disabled = false;
      resetBtn.disabled = false;

      showMessage("Existing project found. You can update its details.", "info");
      projectNameInput.focus();
    } else {
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

updateBtn.addEventListener("click", async () => {
  if (!validateOtherFields()) return;

  if (currentRecNo === null || currentRecNo === undefined) {
    showMessage("Could not determine which record to update. Try re-entering the Project ID.", "error");
    return;
  }

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


resetBtn.addEventListener("click", resetFormToStep2);


window.addEventListener("DOMContentLoaded", resetFormToStep2);