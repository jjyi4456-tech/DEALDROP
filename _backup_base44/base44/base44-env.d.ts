// Type declarations for Base44 Edge Functions (Deno runtime)
declare module "npm:@base44/sdk*" {
  export const createClientFromRequest: (req: any) => any;
  export const Base44Client: any;
  const content: any;
  export default content;
}

declare module "base44:runtime" {
  export const secrets: {
    get(key: string): string | undefined;
    [key: string]: any;
  };
  const content: any;
  export default content;
}
