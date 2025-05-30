module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapping: {
    '^@controllers/(.*)$': '<rootDir>/controllers/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@repositories/(.*)$': '<rootDir>/repositories/$1',
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@adapters/(.*)$': '<rootDir>/adapters/$1',
    '^@middlewares/(.*)$': '<rootDir>/middlewares/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
  },
};