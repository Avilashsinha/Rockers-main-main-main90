// api/store.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_FILE = path.join(__dirname, 'notes-data.json');

// Ensure file exists
if (!fs.existsSync(STORE_FILE)) {
  fs.writeFileSync(STORE_FILE, JSON.stringify([]));
  console.log('📝 Created new persistent storage file');
}

function readFile() {
  try {
    const data = fs.readFileSync(STORE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading notes:', err);
    return [];
  }
}

function writeFile(notes) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(notes, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing notes:', err);
  }
}

export function getNotes() {
  const notes = readFile();
  return notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function addNote(note) {
  const notes = readFile();
  notes.push(note);
  writeFile(notes);
  console.log(`✅ Added note "${note.title}" (${notes.length} total)`);
  return note;
}

export function deleteNote(id) {
  const notes = readFile();
  const newNotes = notes.filter((n) => n.id !== id);
  writeFile(newNotes);
  console.log(`🗑️ Deleted note ID: ${id}`);
}

export function findNote(id) {
  const notes = readFile();
  return notes.find((n) => n.id === id);
}
