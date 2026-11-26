// Imported FIRST from every test file (import order = execution order), so
// the environment is ready before app/tokens modules are evaluated.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-not-real';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-real';
