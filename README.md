# Authentication with Supabase for Baileys

[![npm version](https://img.shields.io/npm/v/supabase-baileys.svg)](https://www.npmjs.com/package/supabase-baileys)
[![license](https://img.shields.io/npm/l/supabase-baileys.svg)](./LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/arosyihuddin/supabase-baileys)](https://github.com/arosyihuddin/supabase-baileys/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/arosyihuddin/supabase-baileys)](https://github.com/arosyihuddin/supabase-baileys/pulls)

> 🔐 Persistent WhatsApp session authentication using Supabase and Baileys.

---

## Introduction

**supabase-baileys** is a persistent authentication adapter for [Baileys](https://github.com/WhiskeySockets/Baileys) that uses [Supabase](https://supabase.com) as a storage backend. It allows WhatsApp multi-session states to be synced across processes or instances using a PostgreSQL + S3 backend via Supabase.

---

## Features

- 🔄 Supports `get`, `set`, `clear`, and `removeCreds` operations
- 🧠 Automatically serializes and deserializes keys using `BufferJSON`
- 📦 Supports multiple session IDs
- ☁️ Supabase-compatible with JSONB schema
- 📁 Clear separation between `creds` and key data

---

## Installation

```bash
npm install supabase-baileys
```

---

## Usage

```ts
import makeWASocket from "baileys";
import { useSupabaseAuthState } from "supabase-baileys";

const { state, saveCreds } = await useSupabaseAuthState({
  supabaseUrl: "https://your-project.supabase.co",
  supabaseKey: "your-anon-key",
  session: "your-session-id",
});

const sock = makeWASocket({
  auth: state,
  // ...other config
});

sock.ev.on("creds.update", saveCreds);
```

---

## Supabase Table Schema

Create the following table in Supabase:

```sql
create table if not exists auth (
  session text not null,
  id text not null,
  value jsonb,
  primary key (session, id)
);
```

You can rename the table by passing `tableName` in the config.

---

## Environment Variables

Alternatively, you can set Supabase credentials via `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Then call:

```ts
const { state, saveCreds } = await useSupabaseAuthState({
  session: "your-session-id",
});
```

---

## API

### `useSupabaseAuthState(config: SupabaseConfig): Promise<SupabaseAuthState>`

#### Parameters:

| Name          | Type   | Required | Description                                                                                                        |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `supabaseUrl` | string | No       | Your Supabase project URL. If not provided, it will be read from the `SUPABASE_URL` environment variable.          |
| `supabaseKey` | string | No       | Your Supabase anon/public key. If not provided, it will be read from the `SUPABASE_ANON_KEY` environment variable. |
| `tableName`   | string | No       | Name of the Supabase table to store credentials (default: `auth`).                                                 |
| `session`     | string | Yes      | A unique session ID for each WhatsApp account.                                                                     |

#### Returns:

```ts
{
  state: AuthenticationState;
  saveCreds: (updatedCreds: Partial<AuthenticationCreds>) => Promise<void>;
  clear: () => Promise<void>;
  removeCreds: () => Promise<void>;
}
```

---

## License

MIT © [Ahmad Rosyihuddin](https://github.com/arosyihuddin)
