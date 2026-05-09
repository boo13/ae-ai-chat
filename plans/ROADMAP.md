# Roadmap

## User-Facing Feedback Submission

Add a panel affordance such as "Report this response" on assistant messages. It should capture the current prompt, script, and error payload, let the user redact details, and submit only after explicit consent. This needs path and layer-name scrubbing, README privacy notes, and an ingest target before it is releasable.

## Opt-In Released-Build Telemetry

Provide the production equivalent of the dev error log, off by default and controlled from panel settings. It should send failures only, never successes, and apply the same scrubbing rules as feedback submission before any data leaves the machine.

## Community Example Submissions

Create a path for users to submit verified `.jsx` scripts once the examples corpus is healthy. Submissions should pass the existing export round trip and require reviewer approval before landing in `ae-ai-starter/Scripts/verified/examples/`.

## Effectiveness Eval Harness

Maintain a fixture set of known-failing prompts and run providers with examples on and off. The goal is to measure error-rate reduction directly instead of relying on anecdotal impressions.

## Error-Log-Driven Example Synthesis

Once the JSONL log has useful volume, add a script that clusters failures by error code and prompt vocabulary, then proposes example titles for a developer to author and AE-verify.

## Auto-Update And Version Check

Add an update check for released ZXP installs so users do not stay on a known-broken build. Keep it passive unless the user chooses to install or download an update.
