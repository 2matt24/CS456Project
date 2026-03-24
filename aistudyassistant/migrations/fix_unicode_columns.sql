-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: fix_unicode_columns.sql
-- Purpose : Ensure emoji and unicode characters are stored correctly.
--           VARCHAR / TEXT columns silently drop non-ASCII characters (emojis,
--           accented letters, etc.) on SQL Server.  NVARCHAR stores them fine.
-- Run once: connect to the database and execute this script.
-- ─────────────────────────────────────────────────────────────────────────────

-- Notes table
ALTER TABLE Notes ALTER COLUMN Title   NVARCHAR(255) NOT NULL;
ALTER TABLE Notes ALTER COLUMN Content NVARCHAR(MAX);

-- Courses table  (Icon column - may already be NVARCHAR; safe to run again)
ALTER TABLE Courses ALTER COLUMN Icon NVARCHAR(50);

-- Optional: ensure course/note names also support unicode
ALTER TABLE Courses ALTER COLUMN CourseName NVARCHAR(255) NOT NULL;
ALTER TABLE Courses ALTER COLUMN CourseCode NVARCHAR(50);
ALTER TABLE Courses ALTER COLUMN Semester   NVARCHAR(50);
