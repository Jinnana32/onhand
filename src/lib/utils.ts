export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function getDaysUntilDue(dueDate: number): number {
  const today = new Date()
  const currentDay = today.getDate()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  // Calculate the next occurrence of this due date
  let dueDateObj: Date
  if (dueDate >= currentDay) {
    // Due date is this month
    dueDateObj = new Date(currentYear, currentMonth, dueDate)
  } else {
    // Due date is next month
    dueDateObj = new Date(currentYear, currentMonth + 1, dueDate)
  }

  const diffTime = dueDateObj.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

