declare module 'argon2' {
  const argon2: {
    argon2id: unknown;
    hash(value: string, options?: unknown): Promise<string>;
    verify(hash: string, value: string): Promise<boolean>;
  };
  export default argon2;
}
