import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/NotesPage.css';

function NotesPage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      setNoteTitle(file.name);
      // In real app, you'd read the file content here
      setNoteContent(`Content from ${file.name} will be extracted here...`);
    }
  };

  const handleSaveNote = () => {
    // This will connect to your backend later
    const newNote = {
      title: noteTitle,
      content: noteContent,
      courseId: courseId,
      createdAt: new Date().toISOString()
    };
    
    console.log('Saving note:', newNote);
    alert('Note saved! (Backend integration coming soon)');
    
    // Clear form
    setNoteTitle('');
    setNoteContent('');
    setUploadedFile(null);
  };

  const handleGenerateSummary = () => {
    // This will call your partner's AI endpoint later
    setIsGeneratingSummary(true);
    
    // Simulating AI call
    setTimeout(() => {
      setSummary(`Summary of "${noteTitle}": This is a placeholder summary. When your backend is ready, this will be an AI-generated summary of your notes covering the key concepts and important points.`);
      setIsGeneratingSummary(false);
    }, 2000);
  };

  return (
    <div className="notes-page-container">
      {/* Top navigation */}
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate(`/course/${courseId}`)}>←</div>
        <h3>Create Note</h3>
        <div className="nav-icons">
          <span className="icon">✓</span>
        </div>
      </div>

      <div className="notes-content">
        {/* Upload section */}
        <div className="upload-section">
          <label className="upload-btn">
            📁 Upload File
            <input 
              type="file" 
              accept=".pdf,.txt,.docx,.md"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          {uploadedFile && (
            <div className="uploaded-file-info">
              <span>📄 {uploadedFile.name}</span>
            </div>
          )}
        </div>

        <div className="divider">
          <span>or type manually</span>
        </div>

        {/* Manual input section */}
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

        {/* Action buttons */}
        <div className="notes-actions">
          <button 
            className="btn-save"
            onClick={handleSaveNote}
            disabled={!noteTitle || !noteContent}
          >
            💾 Save Note
          </button>
          
          <button 
            className="btn-summarize"
            onClick={handleGenerateSummary}
            disabled={!noteContent || isGeneratingSummary}
          >
            {isGeneratingSummary ? '⏳ Generating...' : '✨ Generate Summary'}
          </button>
        </div>

        {/* Summary display */}
        {summary && (
          <div className="summary-section">
            <h4>📝 AI Summary</h4>
            <div className="summary-content">
              {summary}
            </div>
            <button className="btn-save-summary">
              Save Summary
            </button>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
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