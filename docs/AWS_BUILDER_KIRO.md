# AWS Builder Mini-Challenge — Kiro Crew

## Project

SightGrid — Spatial Event Intelligence

## Kiro Crew Usage

Kiro Crew was used as an engineering agent to analyze and test SightGrid's spatiotemporal event-correlation engine.

The task focused on:

- `lib/sightgrid/correlator.ts`
- `lib/sightgrid/topology.ts`
- `lib/sightgrid/types.ts`

Kiro was instructed not to modify production correlation behavior, Ring API authentication, UI code, credentials, or `.env.local`.

## Engineering Task

Kiro first analyzed the existing correlation algorithm and proposed an automated test strategy.

The tests cover:

1. Valid correlation between adjacent zones.
2. Rejection of non-adjacent observations.
3. Rejection of observations outside the correlation window.
4. Travel-time plausibility.
5. Semantic compatibility and its effect on confidence.
6. Adding a valid observation to an incident.
7. Rejecting an unrelated observation from an incident.
8. Resolving an incident.

## Finding During Implementation

The initial proposed travel-time test used a 1-second transition between North Gate and Courtyard.

During implementation, Kiro identified that this was not actually outside SightGrid's effective travel-time tolerance. The correlation engine applies a 5-second tolerance and clamps the lower bound to zero.

The test was therefore changed to a 26-second transition, which exceeds the permitted upper travel-time tolerance and correctly exercises the rejection behavior.

This validated the implementation against the actual correlation logic rather than encoding an incorrect assumption into the test suite.

## Test Infrastructure

Vitest was added as a development dependency with a minimal Node test configuration.

Test command:

    npm test

Result:

    Test Files  1 passed (1)
    Tests       9 passed (9)

## Production Validation

After the tests were implemented, the complete Next.js production build was run:

    npm run build

Result:

    Compiled successfully
    Linting and type checking passed
    Static pages generated successfully

No production correlation source files were modified as part of the Kiro testing task.

## Git Evidence

Commit:

    d39b749 test: add Kiro-assisted correlation engine coverage

Kiro Crew was used for substantive analysis, test design, implementation, debugging, and validation of SightGrid's correlation engine.
