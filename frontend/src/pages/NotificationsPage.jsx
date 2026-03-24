import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd, IoMdNotifications, IoMdCheckmarkCircle } from 'react-icons/io';
import {
  MdArrowBack, MdCalendarToday, MdHome, MdChat, MdSettings,
  MdAutoAwesome, MdAlarm, MdEmojiEvents, MdInfo, MdDoneAll,
} from 'react-icons/md';
import AddModal from '../components/AddModal';
import { notificationsAPI } from '../services/api';
import '../styles/NotificationsPage.css';

/* Map notification type → icon + accent colour */
const TYPE_META = {
  study_reminder: { icon: <MdAlarm size={22} />,       color: '#667eea', bg: '#f0f0ff' },
  achievement:    { icon: <MdEmojiEvents size={22} />,  color: '#f093fb', bg: '#fdf0ff' },
  note_summary:   { icon: <MdAutoAwesome size={22} />,  color: '#43e97b', bg: '#f0fff6' },
  system:         { icon: <MdInfo size={22} />,         color: '#feca57', bg: '#fffbf0' },
};
const DEFAULT_META = { icon: <IoMdNotifications size={22} />, color: '#667eea', bg: '#f0f0ff' };

function timeSince(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationsAPI.getAll();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('[NotificationsPage] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    await notificationsAPI.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.notificationID === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await notificationsAPI.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <div className="notif-container">
        {/* ── Navbar ── */}
        <div className="notif-navbar">
          <button className="notif-nav-btn" onClick={() => navigate(-1)}>
            <MdArrowBack size={22} />
          </button>
          <div className="notif-nav-center">
            <h3>Notifications</h3>
            {unreadCount > 0 && <span className="notif-nav-badge">{unreadCount}</span>}
          </div>
          {unreadCount > 0 ? (
            <button className="notif-read-all-btn" onClick={handleMarkAllRead} title="Mark all read">
              <MdDoneAll size={20} />
            </button>
          ) : (
            <div style={{ width: 38 }} />
          )}
        </div>

        {/* ── Content ── */}
        <div className="notif-content">
          {isLoading && (
            <div className="notif-loading">
              <div className="notif-spinner" />
              <p>Loading notifications…</p>
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="notif-empty">
              <div className="notif-empty-icon">
                <IoMdNotifications size={64} color="#c8cfe0" />
              </div>
              <h3>All caught up!</h3>
              <p>You have no notifications yet. Study reminders and achievements will appear here.</p>
            </div>
          )}

          {!isLoading && notifications.length > 0 && (
            <>
              {unreadCount > 0 && (
                <div className="notif-section-label">
                  {unreadCount} unread
                </div>
              )}

              <div className="notif-list">
                {notifications.map((notif) => {
                  const meta = TYPE_META[notif.type] || DEFAULT_META;
                  return (
                    <div
                      key={notif.notificationID}
                      className={`notif-card ${notif.isRead ? 'is-read' : 'is-unread'}`}
                      onClick={() => !notif.isRead && handleMarkRead(notif.notificationID)}
                    >
                      <div className="notif-card-icon" style={{ background: meta.bg, color: meta.color }}>
                        {meta.icon}
                      </div>

                      <div className="notif-card-body">
                        <p className="notif-card-title">{notif.title}</p>
                        <p className="notif-card-msg">{notif.message}</p>
                        <span className="notif-card-time">{timeSince(notif.createdAt)}</span>
                      </div>

                      <div className="notif-card-right">
                        {!notif.isRead && <span className="notif-unread-dot" />}
                        {notif.isRead && <IoMdCheckmarkCircle size={18} color="#c8cfe0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Bottom Nav ── */}
        <div className="bottom-nav">
          <div className="nav-item" onClick={() => setIsAddModalOpen(true)}>
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

      <AddModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </>
  );
}
