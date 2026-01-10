
const USER_REGISTRATIONS_KEY = 'esqf_my_registrations';

export const getUserRegistrations = (): string[] => {
  const data = localStorage.getItem(USER_REGISTRATIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const registerEventForUser = (eventId: string) => {
  const regs = getUserRegistrations();
  if (!regs.includes(eventId)) {
    localStorage.setItem(USER_REGISTRATIONS_KEY, JSON.stringify([...regs, eventId]));
  }
};
