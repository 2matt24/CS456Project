import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { notesAPI } from '../services/api';
import { IoMdAdd, IoMdCheckmark, IoMdDocument, IoMdCloudUpload } from 'react-icons/io';
import { MdArrowBack, MdCalendarToday, MdHome, MdChat, MdSettings } from 'react-icons/md';
import { FaFileUpload } from 'react-icons/fa';
import '../styles/NotesPage.css';

function NotesPage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setNoteTitle(file.name.replace(/\.[^/.]+$/, ''));
    setIsSaving(true);
    setMessage('');

    try {
      const result = await notesAPI.upload(courseId, file, file.name);
      setMessage('✅ File uploaded and processed successfully!');
      setNoteContent(result.note.content);
      setTimeout(() => navigate(`/course/${courseId}`), 2000);
    } catch (error) {
      setMessage(`❌ Upload failed: ${error.message}`);
      console.error('Upload error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNote = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const result = await notesAPI.create(courseId, noteTitle, noteContent);
      if (result.success) {
        setMessage('Note saved successfully!');
        setTimeout(() => navigate(`/course/${courseId}`), 2000);
      }
    } catch (error) {
      setMessage(`Failed to save note: ${error.message}`);
      console.error('Save note error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setMessage('');
    try {
      const result = await notesAPI.summarize(noteContent);
      setSummary(result.summary);
    } catch (error) {
      setMessage(`Failed to generate summary: ${error.message}`);
      console.error('Summary error:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="notes-page-container">
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate(`/course/${courseId}`)}><MdArrowBack size={28} /></div>
        <h3>Create Note</h3>
        <div className="nav-icons">
          <span className="icon" onClick={handleSaveNote} style={{ cursor: (!noteTitle || !noteContent || isSaving) ? 'not-allowed' : 'pointer', opacity: (!noteTitle || !noteContent || isSaving) ? 0.5 : 1 }}><IoMdCheckmark size={28} /></span>
        </div>
      </div>

      <div className="notes-content">
        {message && <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>{message}</div>}
        <div className="upload-section">
          <label className="upload-btn">
            <FaFileUpload size={20} /> Upload File
            <input type="file" accept=".pdf,.txt,.docx,.md" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          {uploadedFile && <div className="uploaded-file-info"><IoMdDocument size={18} color="#667eea" /><span>{uploadedFile.name}</span></div>}
        </div>

        <div className="divider"><span>or type manually</span></div>

        <div className="input-section">
          <input type="text" className="note-title-input" placeholder="Note Title (e.g., Lesson 6 - Data Structures)" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
          <textarea className="note-content-input" placeholder="Type or paste your notes here..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={10} />
        </div>

        <div className="notes-actions">
          <button className="btn-save" onClick={handleSaveNote} disabled={!noteTitle || !noteContent || isSaving}>{isSaving ? <><IoMdCloudUpload size={20} /> Saving...</> : <><IoMdCloudUpload size={20} /> Save Note</>}</button>
          <button className="btn-summarize" onClick={handleGenerateSummary} disabled={!noteContent || isGeneratingSummary}>{isGeneratingSummary ? '⏳ Generating...' : '✨ Generate Summary'}</button>
        </div>

        {summary && <div className="summary-section"><h4>✨ AI Summary</h4><div className="summary-content">{summary}</div></div>}
      </div>

      <div className="bottom-nav">
        <div className="nav-item" onClick={() => navigate('/dashboard')}><IoMdAdd size={28} /></div>
        <div className="nav-item" onClick={() => navigate('/calendar')}><MdCalendarToday size={24} /></div>
        <div className="nav-item" onClick={() => navigate('/dashboard')}><MdHome size={26} /></div>
        <div className="nav-item" onClick={() => navigate('/chat')}><MdChat size={24} /></div>
        <div className="nav-item" onClick={() => navigate('/settings')}><MdSettings size={26} /></div>
      </div>
    </div>
  );
}

export default NotesPage;
