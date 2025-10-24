import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFilePath = path.join(__dirname, 'notes-data.json');

// Ensure data file exists
if (!fs.existsSync(dataFilePath)) {
  fs.writeFileSync(dataFilePath, JSON.stringify([]));
}

export function getNotes() {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading notes:', err);
    return [];
  }
}

export function addNote(note) {
  const notes = getNotes();
  notes.push(note);
  fs.writeFileSync(dataFilePath, JSON.stringify(notes, null, 2));
}

export function deleteNote(id) {
  const notes = getNotes().filter((n) => n.id !== id);
  fs.writeFileSync(dataFilePath, JSON.stringify(notes, null, 2));
}

export function findNote(id) {
  const notes = getNotes();
  return notes.find((n) => n.id === id);
}
