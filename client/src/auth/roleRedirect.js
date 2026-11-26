// One login page for everyone (doc 3.1): the backend says who you are,
// this map says where you land. Centralized so adding a role's home is a
// one-line change.
export const ROLE_HOME = {
  admin: '/admin',
  barista: '/barista',
  customer: '/',
};

export function homeForRole(role) {
  return ROLE_HOME[role] || '/';
}
