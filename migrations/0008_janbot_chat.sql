-- Janbot (AI chat) persistence: threads, messages, tool calls, attachments, abuse events

CREATE TABLE IF NOT EXISTS "chat_thread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "model" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "token_budget" INTEGER NOT NULL DEFAULT 50000,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "auto_approve_low_risk" INTEGER NOT NULL DEFAULT 0,
    "active_stream_id" TEXT,
    "user_status" TEXT,
    "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
    "archived_at" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_chat_thread_org" ON "chat_thread" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_chat_thread_user" ON "chat_thread" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_chat_thread_org_updated" ON "chat_thread" ("organization_id", "updated_at");

CREATE TABLE IF NOT EXISTS "chat_message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "thread_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "parts_json" TEXT NOT NULL,
    "model" TEXT,
    "metadata_json" TEXT,
    "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("thread_id") REFERENCES "chat_thread" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_chat_message_thread" ON "chat_message" ("thread_id");
CREATE INDEX IF NOT EXISTS "idx_chat_message_thread_created" ON "chat_message" ("thread_id", "created_at");

CREATE TABLE IF NOT EXISTS "chat_tool_call" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "input_json" TEXT,
    "output_json" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "approved_by" TEXT,
    "approved_at" TEXT,
    "latency_ms" INTEGER,
    "error" TEXT,
    "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("message_id") REFERENCES "chat_message" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_chat_tool_call_message" ON "chat_tool_call" ("message_id");

CREATE TABLE IF NOT EXISTS "chat_attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message_id" TEXT NOT NULL,
    "r2_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("message_id") REFERENCES "chat_message" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_chat_attachment_message" ON "chat_attachment" ("message_id");

CREATE TABLE IF NOT EXISTS "chat_abuse_event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "kind" TEXT NOT NULL,
    "snippet" TEXT,
    "created_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "idx_chat_abuse_org_created" ON "chat_abuse_event" ("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_chat_abuse_user_created" ON "chat_abuse_event" ("user_id", "created_at");
