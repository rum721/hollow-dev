# 留白 / Hollow — RAG Knowledge Base

This directory contains structured knowledge files for RAG (Retrieval-Augmented Generation) integration. Each file is designed to be chunked and embedded for semantic search during conversations.

## Directory Structure

```
K1_psychology/          → Core therapeutic frameworks (P0)
K2_self_awareness/      → Personality & self-reflection tools (P0)
K3_astrology/           → Astrological archetypes & metaphors (P1)
K4_eastern_metaphysics/ → BaZi, ZiWei, Numerology (P1)
K5_social_science/      → Social psychology & behavioral science (P1)
K6_holistic_healing/    → Somatic, mindfulness, chakra, tarot (P2)
```

## Retrieval Strategy

Each file is self-contained and topic-focused. When a user's message matches a topic, retrieve the relevant file(s) and inject into context as a `<knowledge>` block before the conversation history.

## Chunk Size Recommendation

Each file is written to be used as a single retrieval unit (500-1500 tokens). For vector databases that require smaller chunks, split at `###` heading boundaries.
