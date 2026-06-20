export const teacherSockets = new Map<string, string>(); // roomToken -> socketId
export const studentPeers = new Map<string, { socketId: string; roomToken: string }>(); // rollNumber -> data