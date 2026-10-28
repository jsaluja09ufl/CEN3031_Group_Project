import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { api } from '../api/client';

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function Home({ username, events = [], onEventUpdated }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [activeTask, setActiveTask] = useState(null);
  const [form, setForm] = useState({
    completed: true,
    difficulty: 'Medium',
    time: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const openCompletion = (task) => {
    setActiveTask(task);
    setForm({
      completed: task.completed !== undefined ? Boolean(task.completed) : true,
      difficulty: task.difficulty || 'Medium',
      time: task.completion_time_minutes != null ? String(task.completion_time_minutes) : '',
      notes: task.completion_notes || ''
    });
    setError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeTask) return;

    if (form.time && (isNaN(Number(form.time)) || Number(form.time) < 0)) {
      setError('Time spent must be a positive number');
      return;
    }

    setSaving(true);
    setError(null);

    const token = localStorage.getItem('session_token');
    const payload = {
      completed: form.completed,
      difficulty: form.difficulty,
      completion_time_minutes: form.time ? parseInt(form.time, 10) : null,
      completion_notes: form.notes.trim() || null
    };

    try {
      const res = await api.updateEventCompletion(token, activeTask.event_id, payload);
      if (res && res.success) {
        if (onEventUpdated) onEventUpdated();
        setActiveTask(null);
      } else {
        setError(res?.error || 'Failed to save completion details');
      }
    } catch {
      setError('Network error saving completion details');
    } finally {
      setSaving(false);
    }
  };

  const dayEvents = events.filter((ev) => isSameDay(ev.start_time, selectedDate));

  return (
    <div className="calendar-wrapper" style={{ padding: '20px', maxWidth: '500px' }}>
      <h2>Welcome, {username}!</h2>
      <h3>Interactive Schedule</h3>
      <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '0 0 10px 0' }}>
        Click any task on the calendar to enter completion details.
      </p>

      <Calendar
        onChange={setSelectedDate}
        value={selectedDate}
        tileContent={({ date, view }) => {
          if (view !== 'month') return null;
          const tasksOnDate = events.filter((ev) => isSameDay(ev.start_time, date));
          if (tasksOnDate.length === 0) return null;
          return (
            <div className="cal-tile-tasks">
              {tasksOnDate.map((t) => (
                <button
                  key={t.event_id}
                  type="button"
                  className={`cal-task-pill ${t.completed ? 'completed' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openCompletion(t);
                  }}
                  title={`${t.title} - Click to enter completion details`}
                >
                  {t.completed ? '✓ ' : ''}{t.title}
                </button>
              ))}
            </div>
          );
        }}
      />

      <div className="calendar-day-tasks" style={{ marginTop: '1.25rem' }}>
        <h4>
          Tasks for {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
        </h4>
        {dayEvents.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No tasks scheduled for this date.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {dayEvents.map((t) => (
              <li
                key={t.event_id}
                className={`cal-task-item ${t.completed ? 'completed' : ''}`}
                onClick={() => openCompletion(t)}
              >
                <div>
                  <strong>{t.completed ? '✓ ' : ''}{t.title}</strong>
                  {t.completed && (
                    <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '2px' }}>
                      {t.difficulty && `Difficulty: ${t.difficulty}`}
                      {t.completion_time_minutes != null && ` | Time: ${t.completion_time_minutes}m`}
                      {t.completion_notes && ` | Notes: ${t.completion_notes}`}
                    </div>
                  )}
                </div>
                <button type="button" className="cal-btn-details">
                  {t.completed ? 'Edit Details' : 'Enter Details'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activeTask && (
        <div className="modal-backdrop" onClick={() => setActiveTask(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Task Completion Details</h3>
              <button
                type="button"
                onClick={() => setActiveTask(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <p style={{ margin: '0.5rem 0 1rem 0', color: '#4b5563' }}>
              <strong>{activeTask.title}</strong>
            </p>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.completed}
                    onChange={(e) => setForm({ ...form, completed: e.target.checked })}
                  />
                  Mark as Completed
                </label>
              </div>

              <div className="form-group">
                <label>Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Very Hard">Very Hard</option>
                </select>
              </div>

              <div className="form-group">
                <label>Time Spent (minutes)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 45"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  rows="3"
                  placeholder="Additional completion details or notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              {error && <div className="message error">{error}</div>}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="btn-submit" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Completion Details'}
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  style={{ background: '#6b7280' }}
                  onClick={() => setActiveTask(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
