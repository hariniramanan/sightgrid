### Friction 1: Ring Developer Playground token expiration

**Task attempted:** Integrate live Ring camera streaming into SightGrid and maintain access during development and testing.

**Steps taken:** Generated a Ring Developer Playground access token, configured it in `.env.local`, connected the Next.js application to the Ring API, and tested device discovery and streaming.

**Expected result:** A smooth development workflow with clear guidance when an access token expires.

**Actual result:** Short-lived access tokens required repeated refreshes. Authentication failures could interrupt debugging and were not always immediately distinguishable from application integration issues.

**Severity:** Moderate

**Workaround:** Refreshed Playground tokens as needed and improved authentication-error guidance in the application. Also submitted an open-source improvement to the Ring API Hello World starter.

**Actionable suggestion:** Provide clearer token-expiration diagnostics, a documented refresh workflow, and explicit recovery instructions in API error responses.

### Friction 2: Testing incidents across multiple devices

**Task attempted:** Demonstrate how security events correlate as activity moves from North Gate to Courtyard and adjacent buildings.

**Steps taken:** Integrated the live Ring Developer Playground camera, created a property topology, and implemented correlation rules based on adjacency, timing, travel-time plausibility, and observation compatibility.

**Expected result:** Ability to test reproducible event sequences involving multiple cameras and sensors.

**Actual result:** The available live integration did not provide the complete multi-device scenario required to demonstrate spatial incident correlation.

**Severity:** Moderate

**Workaround:** Built a deterministic scenario with clearly labeled simulated additional camera and contact-sensor observations, while retaining the live Ring Playground integration.

**Actionable suggestion:** Add configurable multi-device simulation, synchronized event replay, and user-defined device locations to the Ring Developer Playground.
