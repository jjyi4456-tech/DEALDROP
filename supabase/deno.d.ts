// Type declarations for Deno runtime and third-party modules in Supabase Edge Functions
declare const Deno: {
  env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  };
};

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.39.8" {
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: any): any;
}
