export function validateEvent(form) {
  if (!form.title.trim()) return 'Title is required'
  if (!form.priority) return 'Priority is required'
  if (!form.startTime || !form.endTime) return 'Start and end time are required'
  if (new Date(form.endTime) <= new Date(form.startTime)) return 'End time must be after start time'
  return null
}
