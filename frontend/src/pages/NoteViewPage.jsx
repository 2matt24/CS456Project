import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import { IoDocumentTextOutline } from 'react-icons/io5';
import { notesAPI } from '../services/api';
import '../styles/NoteViewPage.css';

function NoteViewPage() {
  const navigate = useNavigate();
  const { courseId, noteId } = useParams();
  const [note, setNote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNote();
  }, [courseId, noteId]);

  const loadNote = async () => {
    try {
      const notes = await notesAPI.getForCourse(courseId);
      const found = notes.find(n => n.noteID === parseInt(noteId));
      setNote(found || null);
    } catch (error) {
      console.error('Failed to load note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="note-view-container">
        <div className="navbar">
          <div className="menu-icon" onClick={() => navigate(`/course/${courseId}`)}>
            <MdArrowBack size={28} />
          </div>
          <h3>Note</h3>
          <div style={{ width: '28px' }}></div>
        </div>
        <p className="note-view-loading">Loading note...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="note-view-container">
        <div className="navbar">
          <div className="menu-icon" onClick={() => navigate(`/course/${courseId}`)}>
            <MdArrowBack size={28} />
          </div>
          <h3>Note</h3>
          <div style={{ width: '28px' }}></div>
        </div>
        <p className="note-view-loading">Note not found.</p>
      </div>
    );
  }

  return (
    <div className="note-view-container">
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate(`/course/${courseId}`)}>
          <MdArrowBack size={28} />
        </div>
        <h3>Note</h3>
        <div style={{ width: '28px' }}></div>
      </div>

      <div className="note-view-content">
        <div className="note-view-header">
          <div className="note-view-icon">
            <IoDocumentTextOutline size={36} color="#667eea" />
          </div>
          <h2 className="note-view-title">{note.title}</h2>
          <p className="note-view-date">
            {new Date(note.createdAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
          {note.fileName && (
            <p className="note-view-filename">📎 {note.fileName}</p>
          )}
        </div>

        {note.content && (
          <div className="note-view-body">
            <h4>Content</h4>
            <div className="note-view-text">{note.content}</div>
          </div>
        )}

        {!note.content && (
          <div className="note-view-empty">
            <p>No text content for this note.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default NoteViewPage;
