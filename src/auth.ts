import { createClient } from '@supabase/supabase-js';
import {
    proto,
    initAuthCreds,
    AuthenticationCreds,
    AuthenticationState,
    SignalDataTypeMap,
    SignalDataSet,
    BufferJSON
} from 'baileys';
import { SupabaseAuthState, SupabaseConfig } from './types';
import dotenv from 'dotenv';
dotenv.config();

export async function useSupabaseAuthState(
    config: SupabaseConfig
): Promise<SupabaseAuthState> {
    const {
        supabaseUrl = process.env.SUPABASE_URL,
        supabaseKey = process.env.SUPABASE_ANON_KEY,
        tableName = 'auth',
        session: sessionId,
    } = config

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase URL or key');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const fixFileName = (file: string) => file.replace(/\//g, '__').replace(/:/g, '-');
    async function readData(file: string): Promise<any | null> {
        const { data, error } = await supabase
            .from(tableName)
            .select('value')
            .eq('session', sessionId)
            .eq('id', fixFileName(file))
            .single()
        if (error || !data) return null
        // rehydrate buffers with BufferJSON.reviver
        const text = JSON.stringify(data.value)
        return JSON.parse(text, BufferJSON.reviver)
    }

    async function writeData(data: any, file: string): Promise<void> {
        // first serialize with BufferJSON.replacer
        const payload = JSON.parse(
            JSON.stringify(data, BufferJSON.replacer)
        )
        const id = fixFileName(file);
        await supabase
            .from(tableName)
            .upsert({ session: sessionId, id, value: payload }, { onConflict: 'session,id' })
    }

    async function removeData(file: string): Promise<void> {
        const id = fixFileName(file);
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('session', sessionId)
            .eq('id', id);
        if (error) throw error;
    }

    async function clear(): Promise<void> {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('session', sessionId)
            .neq('id', 'creds');
        if (error) throw error;
    }

    async function removeCreds(): Promise<void> {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('session', sessionId);
        if (error) throw error;
    }

    // Load or initialize creds
    const rawCreds = await readData('creds');
    const creds: AuthenticationCreds = rawCreds ?? initAuthCreds();

    const state: AuthenticationState = {
        creds,
        keys: {
            get: async <T extends keyof SignalDataTypeMap>(
                type: T,
                ids: string[]
            ): Promise<Record<string, SignalDataTypeMap[T]>> => {
                const result: Record<string, SignalDataTypeMap[T]> = {} as any;
                await Promise.all(
                    ids.map(async (id) => {
                        let value = await readData(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        result[id] = value;
                    })
                );
                return result;
            },

            set: async (data: SignalDataSet) => {
                const entries = Object.entries(data) as Array<[
                    keyof SignalDataTypeMap,
                    Record<string, SignalDataTypeMap[keyof SignalDataTypeMap]>
                ]>;
                const tasks: Promise<void>[] = [];
                for (const [category, categoryData] of entries) {
                    for (const [id, value] of Object.entries(categoryData)) {
                        const file = `${category}-${id}`;
                        tasks.push(
                            (async () => {
                                try {
                                    if (value) await writeData(value, file);
                                    else await removeData(file);
                                } catch (e) {
                                    console.error(`Failed to persist key ${file} to Supabase`, e);
                                }
                            })()
                        );
                    }
                }
                await Promise.all(tasks);
            }
        }
    };

    return {
        state,
        saveCreds: async (updatedCreds: Partial<AuthenticationCreds>) => {
            try {
                Object.assign(creds, updatedCreds);
                await writeData(creds, 'creds');
            } catch (e) {
                console.error('Failed to save creds to Supabase', e);
            }
        },
        clear,
        removeCreds
    };
}
