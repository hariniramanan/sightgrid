# SightGrid

**Spatial event correlation and explainable incident monitoring powered by the Ring API.**

Traditional security systems give you more cameras. SightGrid gives your cameras shared context.

SightGrid is a prototype operations dashboard developed for the Amazon Developer Hackathon 2026 Ring track.

## The problem

Camera and sensor alerts are often isolated. Operators must manually determine whether observations across locations describe one developing incident.

SightGrid combines spatial relationships, timing, and observation compatibility to make those relationships easier to understand.

## Features

- Real Ring Developer Playground API integration
- Ring device discovery and live WebRTC video
- Normalized Ring event observations
- Site topology with connected zones
- Spatial and temporal event correlation
- Explainable incident confidence and event paths
- Deterministic multi-device judge scenario
- Negative-control event rejection
- Human-verification workflow

## Architecture

Ring Developer Playground
    |
    v
Ring API routes and event adapter
    |
    v
Normalized observations
    |
    v
Site topology and correlation engine
    |
    v
Incident timeline and explanations
    |
    v
SightGrid operations dashboard

Core implementation:

| Component | File |
| --- | --- |
| Event types | `lib/sightgrid/types.ts` |
| Site topology | `lib/sightgrid/topology.ts` |
| Correlation engine | `lib/sightgrid/correlator.ts` |
| Ring adapter | `lib/sightgrid/ringAdapter.ts` |
| Incident demo | `app/components/SightGridDemo.tsx` |
| Main dashboard | `app/page.tsx` |
| Ring endpoints | `app/api/ring/` |
| Automated tests | `lib/sightgrid/__tests__/correlator.test.ts` |

## Real versus simulated data

**Real integration:** SightGrid calls the Ring API through the Ring Developer Playground for device discovery, configuration, and streaming. With a valid Playground token, the dashboard displays the Playground's live video stream.

**Simulated observations:** The additional cameras, contact sensor, person/vehicle labels, and observation confidence values used in the judge scenario are deterministic demonstration inputs. They do not represent additional physical Ring devices or live computer-vision detections.

## Getting started

Requirements: Node.js, npm, and access to the Ring Developer Playground.

1. Clone this repository.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local`.
4. Set `RING_ACCESS_TOKEN` in `.env.local` using a fresh token from the Ring Developer Playground.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

Playground tokens are short-lived. Never commit `.env.local` or share your token.

## Tests

Run `npm test` to execute the correlation tests.

Run `npm run build` to verify the production build.

The tests cover adjacency, correlation windows, travel-time plausibility, observation-class compatibility, incident updates, and resolution.

## Demonstration scenario

The sample site contains North Gate, Courtyard, Block A, and Block B.

The judge scenario generates observations across these zones, builds an incident path, explains correlations, and rejects an incompatible event as a negative control.

## Responsible interpretation

SightGrid does not determine criminal intent. Correlated observations require human verification. The prototype does not implement facial recognition or person re-identification.

## Hackathon evidence

### AWS Builder mini-challenge

Kiro Crew supported correlation-engine review, test development, and debugging.

See [Kiro engineering workflow](docs/AWS_BUILDER_KIRO.md).

### Open Source mini-challenge

We contributed improved Playground authentication-error guidance to Amazon's Ring API Hello World repository.

See [Open-source contribution PR #24](https://github.com/AmazonAppDev/ring-api-helloworld/pull/24).

## Technology

Next.js 15, React, TypeScript, Tailwind CSS, Ring API, WebRTC, and Vitest.

## License and attribution

SightGrid is based on Amazon's MIT-licensed Ring API Hello World starter. The original Amazon copyright notice and license are preserved in [LICENSE](LICENSE).

SightGrid-specific modifications were developed for the Amazon Developer Hackathon 2026.
