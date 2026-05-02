export interface Task {
  id: string;
  rawInput: string;
  title: string;
  priority: "high" | "medium" | "low" | string;
  deadline: string | null;
  done: boolean;
  createdAt: string;
}
