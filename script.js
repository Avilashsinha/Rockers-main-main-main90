// CampusNotes JavaScript - Loading check
console.log("CampusNotes script loaded successfully!");

// Use environment-aware API URL
const API_URL = window.location.hostname === 'localhost'
  ? "http://localhost:5000/api"
  : "/api"; // Use relative path for production

const titleEl = document.getElementById("title");
const subjectEl = document.getElementById("subject");
const descEl = document.getElementById("description");
const typeEl = document.getElementById("type");
const fileEl = document.getElementById("file");
const notesList = document.getElementById("notes-list");
const imagesList = document.getElementById("images-list");

async function upload() {
  const title = titleEl.value.trim();
  const subject = subjectEl.value.trim();
  const desc = descEl.value.trim();
  const type = typeEl.value;
  const file = fileEl.files[0];

  if (!title || !file) {
    alert("Please provide a title and select a file.");
    return;
  }

  const uploadBtn = document.querySelector("#upload-box button");
  const originalText = uploadBtn.textContent;
  uploadBtn.textContent = "Uploading...";
  uploadBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("subject", subject);
    formData.append("desc", desc);
    formData.append("type", type);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
    }

    const result = await res.json();
    alert("✅ Uploaded successfully!");

    titleEl.value = "";
    subjectEl.value = "";
    descEl.value = "";
    fileEl.value = "";

    await render();
    showSection(type === "note" ? "notes" : "images");

  } catch (error) {
    console.error("Upload error:", error);

    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      alert("❌ Upload failed: Backend server not available. This is a frontend-only demo.");
    } else {
      alert(`❌ Upload failed: ${error.message}`);
    }
  } finally {
    uploadBtn.textContent = originalText;
    uploadBtn.disabled = false;
  }
}

async function render() {
  try {
    notesList.innerHTML = '<p>Loading notes...</p>';
    imagesList.innerHTML = '<p>Loading images...</p>';

    const res = await fetch("/api/data");
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();

    const notes = data.filter((x) => x.type === "note");
    const images = data.filter((x) => x.type === "image");

    // ✅ Fix Cloudinary URLs for inline preview (remove any auto-download flags)
    notes.forEach((n) => {
      if (n.fileUrl && n.fileUrl.includes("res.cloudinary.com/dwm9m3dwk")) {
        // Clean up URL for inline display
        n.viewUrl = n.fileUrl.replace(/\/upload\/.*?\//, "/upload/");
        // Add explicit download version
        n.downloadUrl = n.fileUrl.includes("?")
          ? `${n.fileUrl}&fl_attachment=true`
          : `${n.fileUrl}?fl_attachment=true`;
      } else {
        n.viewUrl = n.fileUrl;
        n.downloadUrl = n.fileUrl;
      }
    });

    // ✅ Render notes
    notesList.innerHTML = notes.length > 0
      ? notes.map((n) => `
        <div class="card" data-id="${n.id}">
          <h3>${n.title}</h3>
          <div class="meta">${n.subject || "General"}</div>
          <p>${n.desc || ""}</p>
          <div class="file-info">
            <small>📄 ${n.fileName} (${formatFileSize(n.fileSize)})</small>
          </div>
          
          ${n.fileType === "application/pdf"
          ? `<iframe src="${n.viewUrl}" style="width:100%;height:300px;border:1px solid #ccc;border-radius:6px;"></iframe>`
          : ""
        }

          <div class="card-actions">
            <button onclick="openPreview('${n.viewUrl || n.fileUrl}', '${n.fileType}')" class="view-btn">👁️ Preview</button>
            <a href="${n.downloadUrl || n.fileUrl}" download class="download-btn">⬇️ Download Note</a>
            <button onclick="deleteFile('${n.id}')" class="delete-btn">🗑️ Delete</button>
          </div>
        </div>
      `).join("")
      : '<p>No notes uploaded yet.</p>';

    // ✅ Render images
    imagesList.innerHTML = images.length > 0
      ? images.map((i) => `
        <div class="card" data-id="${i.id}">
          <h3>${i.title}</h3>
          <div class="meta">${i.subject || "General"}</div>
          <p>${i.desc || ""}</p>
          <div class="file-info">
            <small>🖼️ ${i.fileName} (${formatFileSize(i.fileSize)})</small>
          </div>
          <img src="${i.fileUrl}" alt="${i.title}" 
               style="width:100%;height:200px;object-fit:cover;border-radius:8px;margin:10px 0;">
          <div class="card-actions">
            <button onclick="openPreview('${i.fileUrl}', '${i.fileType || 'image/jpeg'}')" class="view-btn">👁️ Preview</button>
            <a href="${i.fileUrl}" download class="download-btn">⬇️ Download</a>
            <button onclick="deleteFile('${i.id}')" class="delete-btn">🗑️ Delete</button>
          </div>
        </div>
      `).join("")
      : '<p>No images uploaded yet.</p>';

    updateCounts(notes.length, images.length);
  } catch (error) {
    console.error("Render error:", error);
    notesList.innerHTML = `<p>Unable to load notes. ${error.message}</p>`;
    imagesList.innerHTML = `<p>Unable to load images. ${error.message}</p>`;
  }
}


function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function updateCounts(notesCount, imagesCount) {
  const notesNav = document.querySelector('nav a[onclick="showSection(\'notes\')"]');
  const imagesNav = document.querySelector('nav a[onclick="showSection(\'images\')"]');

  if (notesNav) notesNav.textContent = `Notes (${notesCount})`;
  if (imagesNav) imagesNav.textContent = `Images (${imagesCount})`;
}

async function deleteFile(id) {
  if (!confirm("Are you sure you want to delete this file?")) {
    return;
  }

  try {
    const res = await fetch(`${API_URL}/data/${id}`, {
      method: "DELETE",
    });

    const result = await res.json();

    if (res.ok) {
      alert("✅ File deleted successfully!");
      await render();
    } else {
      alert(`❌ Delete failed: ${result.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Delete error:", error);
    alert("❌ Delete failed: Network error");
  }
}

function showSection(sectionName) {
  const sections = document.querySelectorAll("main section");
  sections.forEach(section => section.classList.remove("active"));

  const targetSection = document.getElementById(sectionName);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  const navLinks = document.querySelectorAll("nav a");
  navLinks.forEach(link => link.classList.remove("active"));

  const activeLink = document.querySelector(`nav a[onclick="showSection('${sectionName}')"]`);
  if (activeLink) {
    activeLink.classList.add("active");
  }
}

function startUploading() {
  showSection('upload');
  setTimeout(() => {
    document.getElementById('file').click();
  }, 100);
}

function toggleTheme() {
  const body = document.body;
  const themeToggle = document.querySelector(".theme-toggle");

  if (body.classList.contains("dark-theme")) {
    body.classList.remove("dark-theme");
    themeToggle.textContent = "🌙";
    localStorage.setItem("theme", "light");
  } else {
    body.classList.add("dark-theme");
    themeToggle.textContent = "☀️";
    localStorage.setItem("theme", "dark");
  }
}

// Preview functions
function openPreview(url, type) {
  const modal = document.getElementById("previewModal");
  const container = document.getElementById("previewContainer");

  if (!modal || !container) {
    console.error("Preview modal elements not found");
    return;
  }

  container.innerHTML = "";

  if (type === "application/pdf") {
    container.innerHTML = `<iframe src="${url}" title="PDF Preview"></iframe>`;
  } else if (type && type.startsWith("image/")) {
    container.innerHTML = `<img src="${url}" alt="Image Preview">`;
  } else if (type && (type.includes("text") || type.includes("document"))) {
    // For text and document files, try to preview in iframe
    container.innerHTML = `<iframe src="${url}" title="Document Preview"></iframe>`;
  } else {
    // Default to iframe for other file types
    container.innerHTML = `<iframe src="${url}" title="File Preview"></iframe>`;
  }

  modal.classList.add("active");
}

function closePreview(event) {
  const modal = document.getElementById("previewModal");
  if (!modal) return;

  if (!event || event.target === modal || event.target.classList.contains("close-btn")) {
    modal.classList.remove("active");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
    document.querySelector(".theme-toggle").textContent = "☀️";
  }

  // Check if we can reach the API, otherwise show frontend-only message
  fetch(`${API_URL}/notes`)
    .then(response => {
      if (response.ok) {
        render();
      } else {
        throw new Error('API not available');
      }
    })
    .catch(error => {
      console.log("Backend not available, showing frontend-only mode");
      notesList.innerHTML = '<div class="card"><h3>🚀 Frontend Demo</h3><p>This is a frontend demo of CampusNotes. To enable full functionality with file uploads, you need to deploy the backend server.</p></div>';
      imagesList.innerHTML = '<div class="card"><h3>📸 Image Gallery</h3><p>Upload functionality requires backend server deployment.</p></div>';
    });
});
