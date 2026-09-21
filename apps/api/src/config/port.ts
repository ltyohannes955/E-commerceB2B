const DEFAULT_API_PORT = 3001;

export function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_API_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
}
