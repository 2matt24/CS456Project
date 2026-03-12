import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { notesAPI } from '../services/api';
import '../styles/NotesPage.css';

function buildFallbackSummary(content) {
  const cleaned = (content || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return 'No note content available to summarize.';
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return cleaned.slice(0, 300);
  }

  return sentences.slice(0, 3).join(' ');
}

function NotesPage() {
  const navigate = useNavigate();
  const { courseId, noteId } = useParams();
  const isEditing = Boolean(noteId);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    setUploadedFile(file);
    setNoteTitle(file.name);

    try {
      const text = await file.text();
      setNoteContent(text);
      setErrorMessage('');
    } catch (error) {
      console.error('File read error:', error);
      setNoteContent('');
      setErrorMessage('Could not read this file. Please copy/paste your note content manually.');
    }
  };

  const handleSaveNote = async () => {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await notesAPI.create(Number(courseId), noteTitle, noteContent);
      setSuccessMessage('Note saved successfully.');
      setNoteTitle('');
      setNoteContent('');
      setUploadedFile(null);
    } catch (error) {
      console.error('Saving note failed:', error);
      setErrorMessage('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setErrorMessage('');

    try {
      const response = await notesAPI.summarize(noteContent);
      setSummary(response.summary || 'No summary was returned.');
    } catch (error) {
      console.error('Summary generation failed:', error);
      setErrorMessage('Failed to generate summary. Please try again.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="notes-page-container">
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate(`/course/${courseId}`)}>←</div>
        <h3>{isEditing ? 'Edit Note' : 'Create Note'}</h3>
        <div className="nav-icons">
          <span className="icon">✓</span>
        </div>
      </div>

      <div className="notes-content">
        <div className="upload-section">
          <label className="upload-btn">
            📁 Upload File
            <input
              type="file"
              accept=".txt,.md"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          {uploadedFile && (
            <div className="uploaded-file-info">
              <span>📄 {uploadedFile.name}</span>
            </div>

            <div className="divider">
              <span>or type manually</span>
            </div>

        <div className="input-section">
          <input
            type="text"
            className="note-title-input"
            placeholder="Note Title (e.g., Lesson 6 - Data Structures)"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
          />

          <textarea
            className="note-content-input"
            placeholder="Type or paste your notes here..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            rows={10}
          />
        </div>

        {errorMessage && <p className="error-text">{errorMessage}</p>}
        {successMessage && <p className="success-text">{successMessage}</p>}

        <div className="notes-actions">
          <button
            className="btn-save"
            onClick={handleSaveNote}
            disabled={!noteTitle || !noteContent || isSaving}
          >
            {isSaving ? '⏳ Saving...' : '💾 Save Note'}
          </button>

          <button
            className="btn-summarize"
            onClick={handleGenerateSummary}
            disabled={!noteContent || isGeneratingSummary}
          >
            {isGeneratingSummary ? '⏳ Generating...' : '✨ Generate Summary'}
          </button>
        </div>

        {summary && (
          <div className="summary-section">
            <h4>📝 AI Summary</h4>
            <div className="summary-content">
              {summary}
            </div>
          </div>
        )}
      </div>

      <div className="bottom-nav">
        <div className="nav-item">➕</div>
        <div className="nav-item">📅</div>
        <div className="nav-item">🏠</div>
        <div className="nav-item active">💬</div>
        <div className="nav-item">⚙️</div>
      </div>
    </div>
  );
}

export default NotesPage;
