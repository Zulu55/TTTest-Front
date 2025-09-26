// Model types aligned with backend C#
// Keep names identical to ease serialization (TaskStatus enum values as strings)
export enum TaskStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed'
}

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  dueDate: string;         // ISO string (e.g., 2025-09-26T00:00:00Z)
  taskStatus: TaskStatus;  // matches C# enum names
}
