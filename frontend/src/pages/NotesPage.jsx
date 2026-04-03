import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { notesAPI } from '../services/api';
import { IoMdAdd, IoMdCheckmark, IoMdDocument, IoMdCloudUpload } from 'react-icons/io';
import { MdArrowBack } from 'react-icons/md';
import { MdCalendarToday, MdHome, MdChat, MdSettings } from 'react-icons/md';
import { FaFileUpload } from 'react-icons/fa';
import '../styles/NotesPage.css';

function NotesPage() {
    const navigate = useNavigate();
    const { courseId } = useParams();
    const location = useLocation();
    const editNote = location.state?.editNote || null;

    const [noteTitle, setNoteTitle]           = useState(editNote?.title   || '');
    const [noteContent, setNoteContent]       = useState(editNote?.content || '');
    const [uploadedFile, setUploadedFile]     = useState(null);
    // If a file upload already created the note in the DB, store its ID here
    // so "Save Note" does an update rather than a duplicate create.
    const [uploadedNoteId, setUploadedNoteId] = useState(null);
    const [summary, setSummary]               = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [isSaving, setIsSaving]             = useState(false);
    const [message, setMessage]               = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Mark as having unsaved changes whenever the user edits title or content
    useEffect(() => {
        if (noteTitle || noteContent) {
            setHasUnsavedChanges(true);
        }
    }, [noteTitle, noteContent]);

    // ── File upload ──────────────────────────────────────────────────────────
    // The backend /api/notes/upload already creates + saves the note, so we
    // only need the user to review and optionally update before navigating.
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadedFile(file);
        setNoteTitle(file.name.replace(/\.[^/.]+$/, '')); // strip extension
        setIsSaving(true);
        setMessage('⏳ Uploading and processing your file…');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('courseId', courseId);
            formData.append('title', file.name);

            const response = await fetch('https://cs456project.onrender.com/api/notes/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                setNoteContent(result.note.content || '');

                // Store the note ID so "Save Note" updates instead of creating a duplicate
                if (result.note.noteID) {
                    setUploadedNoteId(result.note.noteID);
                }

                // Do NOT auto-navigate — let the user review the extracted content first
                setMessage('✅ File processed! Review the content below and click "Save Note" when ready.');
                setHasUnsavedChanges(false); // content just came from server — not unsaved yet
            } else {
                const error = await response.json();
                setMessage(`❌ Upload failed: ${error.error}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            setMessage('❌ Upload failed. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Manual save (only triggered by user clicking Save Note) ──────────────
    const handleSaveNote = async () => {
        if (!noteTitle.trim()) {
            setMessage('❌ Please enter a note title.');
            return;
        }
        if (!noteContent.trim()) {
            setMessage('❌ Please add some content to your note.');
            return;
        }

        setIsSaving(true);
        setMessage('');

        try {
            if (editNote) {
                // Editing an existing note passed via navigation state
                await notesAPI.update(editNote.noteID, noteTitle, noteContent);
                setMessage('✓ Note updated! Returning to course...');
            } else if (uploadedNoteId) {
                // File was uploaded — the backend already created the note;
                // just update it with any edits the user made.
                await notesAPI.update(uploadedNoteId, noteTitle, noteContent);
                setMessage('✓ Note saved! Returning to course...');
            } else {
                // Fully manual note
                await notesAPI.create(courseId, noteTitle, noteContent);
                setMessage('✓ Note saved! Returning to course...');
            }

            setHasUnsavedChanges(false);
            setTimeout(() => { navigate(`/course/${courseId}`); }, 800);
        } catch (error) {
            setMessage('❌ Failed to save note. Please try again.');
            console.error('Save note error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // ── AI summary ───────────────────────────────────────────────────────────
    const handleGenerateSummary = async () => {
        setIsGeneratingSummary(true);
        setMessage('');

        try {
            const result = await notesAPI.summarize(noteContent);
            setSummary(result.summary);
        } catch (error) {
            setMessage('Failed to generate summary. Please try again.');
            console.error('Summary error:', error);
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    return (
        <div className="notes-page-container">
            {/* Top navigation */}
            <div className="notes-navbar">
                <button className="notes-nav-btn" onClick={() => navigate(`/course/${courseId}`)}>
                    <MdArrowBack size={22} />
                </button>
                <h3>
                    {editNote ? 'Edit Note' : 'Create Note'}
                    {hasUnsavedChanges && (
                        <span className="unsaved-indicator">● Unsaved</span>
                    )}
                </h3>
                <button
                    className="notes-nav-btn"
                    onClick={handleSaveNote}
                    disabled={!noteTitle || !noteContent || isSaving}
                >
                    <IoMdCheckmark size={22} />
                </button>
            </div>

            <div className="notes-content">
                {message && (
                    <div className={`message ${
                        message.includes('❌') ? 'error'
                        : message.includes('✅') || message.includes('✓') ? 'success'
                        : 'info'
                    }`}>
                        {message}
                    </div>
                )}

                {/* Upload section */}
                <div className="upload-section">
                    <label className="upload-btn">
                        <FaFileUpload size={20} />
                        Upload File
                        <input
                            type="file"
                            accept=".pdf,.txt,.docx,.md"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                    </label>
                    {uploadedFile && (
                        <div className="uploaded-file-info">
                            <IoMdDocument size={18} color="#667eea" />
                            <span>{uploadedFile.name}</span>
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
                        disabled={!noteTitle || !noteContent || isSaving}
                    >
                        {isSaving ? (
                            <><IoMdCloudUpload size={20} /> Saving...</>
                        ) : (
                            <><IoMdCheckmark size={20} /> Save Note</>
                        )}
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
                        <h4>✨ AI Summary</h4>
                        <div className="summary-content">{summary}</div>
                    </div>
                )}
            </div>

            {/* Bottom navigation */}
            <div className="bottom-nav">
                <div className="nav-item" onClick={() => navigate('/dashboard')}>
                    <IoMdAdd size={28} />
                </div>
                <div className="nav-item" onClick={() => navigate('/calendar')}>
                    <MdCalendarToday size={24} />
                </div>
                <div className="nav-item" onClick={() => navigate('/dashboard')}>
                    <MdHome size={26} />
                </div>
                <div className="nav-item" onClick={() => navigate('/chat')}>
                    <MdChat size={24} />
                </div>
                <div className="nav-item" onClick={() => navigate('/settings')}>
                    <MdSettings size={26} />
                </div>
            </div>
        </div>
    );
}

export default NotesPage;
