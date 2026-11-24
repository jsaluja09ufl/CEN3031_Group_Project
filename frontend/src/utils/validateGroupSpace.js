export function validateGroupSpace(form) {
  if (!form.group_name || !form.group_name.trim()) {
    return 'Group name is required'
  }
  if (form.group_name.trim().length > 100) {
    return 'Group name must be 100 characters or less'
  }
  return null
}

