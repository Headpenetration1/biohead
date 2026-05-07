jest.mock('@sentry/react-native', () => {
  const scope = {
    setContext: jest.fn(),
    setExtra: jest.fn(),
    setTag: jest.fn(),
  };

  return {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    init: jest.fn(),
    withScope: jest.fn((callback) => callback(scope)),
    wrap: jest.fn((component) => component),
  };
});
