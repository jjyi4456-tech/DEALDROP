// Short shareable squad code + share link builder for "Squad กินแหลก".
export const genSquadCode = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

export const squadShareLink = (code) =>
  `${window.location.origin}/user/squad/${code}`;