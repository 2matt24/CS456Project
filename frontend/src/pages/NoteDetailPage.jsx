import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import { authAPI, notesAPI } from '../services/api';
import '../styles/NotesPage.css';

function NoteDetailPage() {
  const navigate = useNavigate();
  const { courseId, noteId } = useParams();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const session = await authAPI.getSession();
      if (!session.authenticated) {
        navigate('/');
        return;
      }
      try {
        const result = await notesAPI.getById(noteId);
        setNote(result);
      } catch (err) {
        setError(err.message || 'Failed to load note');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [courseId, navigate, noteId]);

  return (
    <div className="notes-page-container">
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate(`/course/${courseId}`)}><MdArrowBack size={28} /></div>
        <h3>Note Details</h3>
        <div style={{ width: '28px' }} />
      </div>
      <div className="notes-content">
        {isLoading && <p>Loading note...</p>}
        {error && <div className="message error">{error}</div>}
        {note && (
          <>
            <input className="note-title-input" value={note.title} readOnly />
            <textarea className="note-content-input" value={note.content || ''} readOnly rows={16} />
            {note.fileName && <div className="uploaded-file-info"><span>📎 {note.fileName}</span></div>}
          </>
        )}
      </div>
    </div>
  );
}

export default NoteDetailPage;
