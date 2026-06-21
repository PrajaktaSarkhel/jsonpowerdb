# Project Management Form — JsonPowerDB

A lightweight, browser-based Project Management form built with plain HTML, CSS and JavaScript. It stores and retrieves data directly from **JsonPowerDB (JPDB)** using its REST API — no backend server required.

The form supports creating new project records and updating existing ones, with smart field/button states that adapt based on whether the entered Project ID already exists in the database.

---

## 📑 Table of Contents

- [Description](#description)
- [Benefits of using JsonPowerDB](#benefits-of-using-jsonpowerdb)
- [Scope of Functionalities](#scope-of-functionalities)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Usage](#setup--usage)
- [Examples of Use](#examples-of-use)
- [Release History](#release-history)
- [Project Status](#project-status)
- [Sources](#sources)

---

## Description

This form lets a user create, view, and update **Project** records stored in the `PROJECT-TABLE` relation of the `COLLEGE-DB` database on JsonPowerDB.

**Fields used:**

| Field | Description |
|---|---|
| Project-ID | Primary Key |
| Project-Name | Name of the project |
| Assigned-To | Person/team the project is assigned to |
| Assignment-Date | Date the project was assigned |
| Deadline | Project deadline date |

**Workflow:**

1. On page load (or after any button click), the form appears empty with the cursor on the **Project ID** field. All other fields and buttons are disabled.
2. The user types a Project ID:
   - **If it does not exist** in the database → `Save` and `Reset` buttons are enabled, and the user can fill in the remaining fields.
   - **If it already exists** → the existing record is loaded into the form, the Project ID field is locked, and `Update` + `Reset` buttons are enabled so the user can modify the other fields.
3. All non-key fields are validated to ensure none are left empty before saving/updating.
4. `Save` inserts a new record; `Update` modifies an existing one; `Reset` clears the form back to its initial state.

---

## Benefits of using JsonPowerDB

- Simplest way to retrieve data in JSON format.
- Schema-free, simple to use, nimble, in-memory database.
- Built on top of **PowerIndeX**, a fast real-time data indexing engine.
- Stores data in a low-level (raw), human-readable form.
- Helps developers code faster, which in turn reduces development cost.
- **Serverless-friendly**: a front-end developer can build a complete data-driven application using only HTML/CSS/JS, calling the JPDB REST API directly from the browser — no backend code needed.

---

## Scope of Functionalities

- ✅ Create (Save) a new project record
- ✅ Read (auto-fetch) an existing record by Project ID
- ✅ Update an existing project record
- ✅ Client-side validation (no empty fields)
- ✅ Field/button enable-disable logic matching real-world data-entry UX
- ❌ Delete functionality (not included in current scope)

---

## Tech Stack

- **HTML5** — form structure
- **CSS3** — styling
- **JavaScript (Vanilla, ES6+)** — form logic & API calls (`fetch`)
- **JsonPowerDB (JPDB)** — REST-API based backend database (DBSaaS)

---

## Project Structure

```
project-management-jpdb/
├── index.html               # Main form page
├── style.css                # Styling
├── js/
│   ├── jpdb-config.example.js  # Template - copy this to jpdb-config.js
│   ├── jpdb-config.js          # Your real token (gitignored, not on GitHub)
│   └── app.js                   # Core form logic + JPDB API calls
└── README.md
```

---

## Setup & Usage

1. **Get a free JsonPowerDB account**
   Register at the [JPDB Developer Registration page](http://api.login2explore.com:5577/user/register_dev.html) and log in to your User Dashboard.

2. **Copy your credentials**
   From your dashboard, copy your **Connection Token** and your **API Base URL**.

3. **Configure the project**
   Copy `js/jpdb-config.example.js` to a new file named `js/jpdb-config.js`, then open it and replace the placeholder token:
   ```js
   const JPDB_CONFIG = {
     BASE_URL: "http://api.login2explore.com:5577",
     TOKEN: "your-token-here",
     DB_NAME: "COLLEGE-DB",
     REL_NAME: "PROJECT-TABLE"
   };
   ```
   > `js/jpdb-config.js` is listed in `.gitignore` and is never pushed to GitHub - your real token stays local.

4. **Run it**
   Open `index.html` in any modern browser (double-click it, or use VS Code's "Live Server" extension for auto-reload).

5. **Try it out**
   - Enter a new Project ID → fill the form → click **Save**.
   - Enter that same Project ID again → see it auto-load → change a field → click **Update**.
   - Click **Reset** any time to start over.

---

## Examples of Use

**Adding a new project:**
```
Project-ID: P101
Project-Name: Library Automation System
Assigned-To: Prajakta Sharma
Assignment-Date: 2026-06-01
Deadline: 2026-07-15
```
→ Click **Save** → record is inserted into `PROJECT-TABLE`.

**Updating it later:**
```
Type "P101" in Project ID → form auto-fills →
change Deadline to 2026-07-30 → click Update
```

---

## Release History

| Version | Date | Notes |
|---|---|---|
| v1.0.0 | 2026-06-20 | Initial release — Project Management Form with Save/Update/Reset workflow connected to JsonPowerDB |

---

## Project Status

🟢 **Active** — Core CRUD (Create/Read/Update) workflow complete.

---

## Sources

- [JsonPowerDB Official Site](https://login2explore.com/jpdb/)
- [JPDB API Command Reference](http://login2explore.com/jpdb/docs.html)
- [JsonPowerDB Developer Registration](http://api.login2explore.com:5577/user/register_dev.html)