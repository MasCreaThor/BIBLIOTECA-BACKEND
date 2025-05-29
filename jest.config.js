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
    moduleNameMapper: {
      '^@domain/(.*)$': '<rootDir>/domain/$1',
      '^@application/(.*)$': '<rootDir>/application/$1',
      '^@infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
      '^@interface/(.*)$': '<rootDir>/interface/$1',
    },
  };