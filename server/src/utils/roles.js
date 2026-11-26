// The three roles of the whole platform (requirements doc 3.8). Centralized
// so authorization checks never compare against raw strings scattered
// through the code. A separate Role collection is deliberately not built:
// three fixed roles need constants, not a database table.
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  BARISTA: 'barista',
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));
