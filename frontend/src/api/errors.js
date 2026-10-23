export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export class NetworkError extends Error {
  constructor(message = "Can't reach the CyberCheckmate server.") {
    super(message)
    this.name = 'NetworkError'
  }
}

export class FeatureUnavailableError extends Error {
  constructor(message = 'Not available on this server yet.') {
    super(message)
    this.name = 'FeatureUnavailableError'
    this.status = 404
  }
}

export class InvalidResponseError extends Error {
  constructor(message = 'The server sent a result we could not read.') {
    super(message)
    this.name = 'InvalidResponseError'
  }
}
