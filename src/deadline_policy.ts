export type DeadlineStatus = "on_track" | "due_soon" | "overdue";

export interface DeadlineDecision {
  status: DeadlineStatus;
  educatorAttention: boolean;
  learnerInstruction: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function decideDeadline(deadline: Date, now: Date): DeadlineDecision {
  const remainingDays = (deadline.getTime() - now.getTime()) / DAY_MS;

  if (remainingDays < 0) {
    return {
      status: "overdue",
      educatorAttention: true,
      learnerInstruction: "Acknowledge the missed deadline and propose one concrete recovery step.",
    };
  }

  if (remainingDays <= 2) {
    return {
      status: "due_soon",
      educatorAttention: true,
      learnerInstruction: "Prioritize the next required action and keep the explanation concise.",
    };
  }

  return {
    status: "on_track",
    educatorAttention: false,
    learnerInstruction: "Teach the concept, then end with one practical next action.",
  };
}
