# Wub

The open-source url shortener.

## Tech Stack

1. Vercel - Hosting
2. Neon Postgres & Serverless - DB
3. Upstash
   1. Redis - Rate limiting when not running on Cloudflare Workers. Workers use the rate limiting binding, keyed by client IP.
   2. QStash - Serverless queuing

## Project management

Using Linear to keep a backlog of ideas / things I want to do with Wub.
