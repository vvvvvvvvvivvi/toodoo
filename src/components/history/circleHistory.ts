import type { Circle, Task } from '@/types/models'

// Past = ended in some way, regardless of how (cleanPlate/abandoned/closed).
// Newest first by date, then by endedAt so same-day circles order sensibly.
export function getPastCircles(circles: Circle[]): Circle[] {
  return circles
    .filter((c) => c.state !== 'planning' && c.state !== 'active')
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      return (b.endedAt ?? '').localeCompare(a.endedAt ?? '')
    })
}

// Completed tasks keep their circleId forever (only backlog-released tasks
// get it cleared on circle close — Invariant 8), so this stays reliable no
// matter how long ago the circle ended.
export function getDigestedTasksFor(circleId: string, tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.circleId === circleId && t.state === 'completed')
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))
}
