# DevGlobe Scaling and Sustainability Guide

This document covers the real costs, bottlenecks, and practical recommendations
for scaling DevGlobe from a handful of users to tens of thousands.

---

## 1. Current Architecture Costs (per user)

DevGlobe's data flow per active user:

| Activity | Frequency | Payload Size | Daily Volume |
|---|---|---|---|
| Heartbeat | Every 30s while coding | ~600 bytes (req + resp) | ~960 beats/day (8hr) |
| Geolocation | 1 request per 1-4 hours (cached) | ~1 KB | 2-8 requests/day |
| Status update | Occasional | ~200 bytes | Negligible |

**Per-user daily bandwidth**: ~576 KB (heartbeats) + ~8 KB (geo) = ~584 KB/day

**Per-user monthly bandwidth** (22 working days): ~12.8 MB/month

### External API budget (shared across all users)

| Provider | Free Tier Limit | Per-User Daily Usage | Max Concurrent Users |
|---|---|---|---|
| freeipapi.com | 3,600 req/hr | 2-8 req/day | ~1,800-7,200 (depends on cache TTL) |
| ipapi.co (fallback) | 1,000 req/day | 0-2 req/day (fallback only) | N/A |
| GitHub API | 5,000 req/hr (authenticated) | ~1-5 req/day | ~40,000+ |
| Supabase (free) | 5GB egress/month, 50K MAU | ~12.8 MB/month | ~390 users at 5GB cap |

---

## 2. Scaling Milestones and Bottlenecks

| Concurrent Users | Monthly Egress | Est. Monthly Cost | First Bottleneck |
|---|---|---|---|
| 1-100 | < 1.3 GB | $0 (free tier) | None |
| 100-390 | 1.3-5 GB | $0 | Supabase 5GB egress limit approached |
| 390-1,000 | 5-12.8 GB | $25 | Supabase free tier exceeded; upgrade to Pro |
| 1,000-4,000 | 12.8-51 GB | $25-50 | Geo API: freeipapi.com saturates at 3,600 req/hr |
| 4,000-8,500 | 51-109 GB | $25-75 | Supabase Pro 250GB egress comfortable; geo needs paid provider |
| 8,500-50,000 | 109-640 GB | $50-200 | Database connections, need pooling and paid geo |
| 50,000+ | 640 GB+ | $200+ | Custom geo solution, regional deployment, WebSockets |

**Note**: "Concurrent users" means users actively coding and sending heartbeats
during the same hour. Total registered users will be much higher.

### Bottleneck Details

**Geolocation API (hits first at ~1,000-4,000 users)**:
- freeipapi.com allows 3,600 requests/hour
- With 1hr cache TTL: each user makes ~1 geo request/hr while active
- At 3,600 concurrent users, the free tier is fully consumed
- ipapi.co fallback adds only 1,000 req/day -- not meaningful at scale

**Supabase egress (hits at ~390 users on free, ~19,500 on Pro)**:
- Free tier: 5 GB/month
- Pro tier ($25/mo): 250 GB/month
- Each active user consumes ~12.8 MB/month (22 working days)

**Database connections (hits at ~50,000+ users)**:
- Supabase free: 60 direct connections
- Supabase Pro: 100+ direct connections with pgbouncer pooling
- REST API (PostgREST) handles connection pooling automatically
- Direct connections only matter if using realtime subscriptions

---

## 3. Optimization Recommendations

### Already implemented or easy wins (client-side)

| Optimization | Impact | Effort |
|---|---|---|
| Geo cache TTL: 1hr to 4hr | Reduces geo API calls 4x | Trivial config change |
| Adaptive heartbeat: 30s to 60s when idle | Reduces heartbeat volume ~40% | Small code change |
| Client-side deduplication (skip identical payloads) | Reduces redundant writes ~20-30% | Small code change |
| Provider health tracking (skip failed providers) | Avoids wasting quota on down providers | Already implemented |

**Combined impact**: These four changes reduce per-user bandwidth from ~584 KB/day
to ~350 KB/day and geo API calls from ~8/day to ~2/day.

### Server-side (Supabase)

| Optimization | Impact | Effort |
|---|---|---|
| Connection pooling via pgbouncer | Supports 10x more concurrent connections | Built into Supabase, enable in dashboard |
| Row Level Security (RLS) | Users can only write/read their own data | Already active |
| Edge Functions for rate limiting | Per-user server-side rate limiting | Medium (deploy Deno function) |
| Database-level rate limiting | Prevent abuse at the DB layer | Medium (PostgreSQL function + trigger) |
| Heartbeat aggregation | Batch multiple heartbeats into 1 write | Medium (Edge Function or client batching) |

### Future scaling (4,000+ users)

| Optimization | Impact | Effort |
|---|---|---|
| Self-hosted geo (MaxMind GeoLite2) | Eliminates all external geo API calls | Medium |
| WebSocket heartbeats | Reduces HTTP overhead per beat by ~80% | High (architecture change) |
| Regional edge deployment | Reduces latency for non-US users | High (multi-region Supabase) |
| Heartbeat compression | gzip payloads, reduce bandwidth ~60% | Low (HTTP header) |

---

## 4. Abuse Prevention Layers

| Layer | Protection | Where | Status |
|---|---|---|---|
| API key format | `devglobe_` prefix + length validation | Client | Implemented |
| Client rate limiting | Minimum 10s between heartbeats | Client | Implemented |
| Payload size guard | Maximum 2 KB per heartbeat | Client | Implemented |
| Supabase RLS | Each user can only write their own rows | Server | Active |
| Supabase rate limiting | Built-in per-IP throttling | Server | Active |
| Edge Function rate limit | Per-user request cap (future) | Server | Not yet implemented |

### Abuse scenarios and mitigations

**Spam heartbeats**: Client enforces 10s minimum interval. Server-side, Supabase
per-IP rate limiting catches clients that bypass the extension. For additional
protection, deploy an Edge Function that enforces per-API-key rate limits.

**Fake locations**: Geolocation is IP-based and server-resolved. Clients cannot
spoof their location unless they use a VPN, which is acceptable behavior.

**Data scraping**: RLS ensures users can only read their own detailed data.
Public globe view shows only anonymized/aggregated positions.

---

## 5. Cost Optimization Quick Wins

Ranked by impact-to-effort ratio:

### 1. Self-hosted geolocation with MaxMind GeoLite2

This is the single biggest cost reduction available.

- **What**: Replace freeipapi.com and ipapi.co with a local IP-to-location database
- **Cost**: Free (GeoLite2-City database, ~60 MB, updated weekly)
- **Deployment**: Supabase Edge Function or bundled lookup table
- **Impact**: Eliminates ALL third-party geo API calls and their rate limits
- **Removes bottleneck**: Geo API saturation at 3,600 req/hr is no longer a concern

### 2. Upgrade to Supabase Pro ($25/month)

- **What**: 250 GB egress/month, 100K MAU, 8 GB database, daily backups
- **Impact**: Supports ~19,500 concurrent users (up from ~390 on free tier)
- **When to upgrade**: As soon as monthly egress approaches 4 GB

### 3. Increase geo cache TTL to 4 hours

- **What**: Change the geolocation cache duration from 1 hour to 4 hours
- **Impact**: 4x reduction in geo API calls with negligible accuracy loss
  (developers rarely change physical location during a coding session)
- **Effort**: Single constant change in the extension code

### 4. Adaptive heartbeat interval

- **What**: Send heartbeats every 60s when no file changes detected (vs 30s active)
- **Impact**: ~40% reduction in heartbeat volume during idle-but-open periods
- **Effort**: Small change to heartbeat scheduling logic

---

## 6. Cost Projection Summary

Assuming optimizations from Section 3 are applied progressively:

| Scale | Monthly Cost | Key Actions |
|---|---|---|
| 0-500 users | $0 | Free tier, no changes needed |
| 500-2,000 | $25 | Supabase Pro, increase geo cache TTL |
| 2,000-10,000 | $25 | Add MaxMind GeoLite2 (eliminates geo bottleneck) |
| 10,000-50,000 | $25-75 | Adaptive heartbeats, heartbeat batching |
| 50,000+ | $75-300 | WebSocket transport, regional deployment |

The key insight: with MaxMind GeoLite2 and Supabase Pro ($25/mo), DevGlobe can
comfortably serve 10,000+ concurrent users. The architecture is inherently
efficient because heartbeats are tiny payloads and geolocation can be fully
self-hosted.
