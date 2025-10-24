// File-based persistent store
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_FILE = path.join(__dirname, 'notes-data.json');

// Initialize store from file or create empty array
let notesStore = [];

function loadNotes() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf8');
      notesStore = JSON.parse(data);
      console.log(`Loaded ${notesStore.length} notes from persistent storage`);
    } else {
      notesStore = [];
      saveNotes();
      console.log('Created new persistent storage file');
    }
  } catch (error) {
    console.error('Error loading notes:', error);
    notesStore = [];
  }
}

function saveNotes() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(notesStore, null, 2), 'utf8');
    console.log(`Saved ${notesStore.length} notes to persistent storage`);
  } catch (error) {
    console.error('Error saving notes:', error);
  }
}

// Load notes on module initialization
loadNotes();

export function getNotes() {
  try {
    return notesStore.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('Error in getNotes:', error);
    return [];
  }
}

export function addNote(note) {
  try {
    notesStore.push(note);
    saveNotes();
    console.log('Note added:', note.title, 'Total notes:', notesStore.length);
    return note;
  } catch (error) {
    console.error('Error in addNote:', error);
    return null;
  }
}

export function deleteNote(id) {
  try {
    const noteIndex = notesStore.findIndex(note => note.id === id);
    if (noteIndex === -1) {
      return null;
    }
    const note = notesStore[noteIndex];
    notesStore.splice(noteIndex, 1);
    saveNotes();
    return note;
  } catch (error) {
    console.error('Error in deleteNote:', error);
    return null;
  }
}

export function findNote(id) {
  try {
    return notesStore.find(note => note.id === id);
  } catch (error) {
    console.error('Error in findNote:', error);
    return null;
  }
}