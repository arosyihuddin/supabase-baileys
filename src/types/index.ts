import { AuthenticationCreds, AuthenticationState } from "baileys"

export type SupabaseConfig = {
    supabaseUrl?: string
    supabaseKey?: string
    tableName?: string
    session: string
}

export type SupabaseAuthState = {
    state: AuthenticationState;
    saveCreds: (updatedCreds: Partial<AuthenticationCreds>) => Promise<void>;
    clear: () => Promise<void>;
    removeCreds: () => Promise<void>;
};
