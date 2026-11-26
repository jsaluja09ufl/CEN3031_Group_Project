export function eventsOverlap(a, b) {
  return new Date(a.start_time) < new Date(b.end_time) && new Date(a.end_time) > new Date(b.start_time)
}

export function eventKey(event) {
  return event.group_id ? `group-${event.event_id}` : `personal-${event.event_id}`
}

export function findConflicts(newEvent, events) {
  return events.filter((event) => eventsOverlap(newEvent, event))
}

export function getConflictKeys(events) {
  const keys = new Set()
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (eventsOverlap(events[i], events[j])) {
        keys.add(eventKey(events[i]))
        keys.add(eventKey(events[j]))
      }
    }
  }
  return keys
}
