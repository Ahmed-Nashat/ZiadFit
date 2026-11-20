export class ApllicationException extends Error {
  constructor(
    public status: number,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = this.constructor.name;
  }
}

export class BadRequestException extends ApllicationException {
  constructor(message: string = "Bad Reqeust", cause?: unknown) {
    super(400, message, cause);
  }
}

export class UnauthorizedException extends ApllicationException {
  constructor(message: string = "Unauthorized", cause?: unknown) {
    super(401, message, cause);
  }
}

export class ForbiddenException extends ApllicationException {
  constructor(message: string = "Forbidden", cause?: unknown) {
    super(403, message, cause);
  }
}

export class NotFoundException extends ApllicationException {
  constructor(message: string = "Not Found", cause?: unknown) {
    super(404, message, cause);
  }
}

export class ConflictException extends ApllicationException {
  constructor(message: string = "Conflict", cause?: unknown) {
    super(409, message, cause);
  }
}

export class TooManyRequestException extends ApllicationException {
  constructor(message: string = "Too Many Request", cause?: unknown) {
    super(429, message, cause);
  }
}

export class ServerException extends ApllicationException {
  constructor(message: string = "Internal Server Error", cause?: unknown) {
    super(500, message, cause);
  }
}
