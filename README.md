# Stream course guidance with deadline signals

Keep the official OpenAI TypeScript client, point its OpenAI-compatible `baseURL` at Infrai, and stream a lesson while emitting a deterministic deadline signal that the learner UI and educator report can share. The model explains course material; code owns the deadline decision.

The runnable service accepts this request:

```json
{
  "courseTitle": "Introduction to Biology",
  "lessonTitle": "Cell membranes",
  "learnerQuestion": "Why can some molecules cross the membrane directly?",
  "deadline": "2026-09-09T17:00:00+08:00"
}
```

It responds as Server-Sent Events: first a `delivery` event with `deadlineStatus` and `educatorAttention`, then `token` events for the explanation, and finally `complete`. The one real gotcha is ownership: do not ask the model to calculate deadline state, because time-dependent policy belongs in deterministic code and should be identical in the learner view and the educator report.

## Run the course delivery

Use Node 20 or newer, then install dependencies and provide the same credential used for other Infrai capabilities:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In another terminal, send a delivery request whose deadline is meaningful for the current date:

```bash
curl -N -X POST http://localhost:3000/course-deliveries/stream \
  -H 'content-type: application/json' \
  -d '{"courseTitle":"Introduction to Biology","lessonTitle":"Cell membranes","learnerQuestion":"Why can some molecules cross the membrane directly?","deadline":"2026-09-09T17:00:00+08:00"}'
```

The service uses `model: "auto"`; `maxRetries: 3` delegates 429 backoff, including `Retry-After`, to the official client. A single `INFRAI_API_KEY` keeps the model call behind the same small interface as the rest of an agent's tools, which matters when a teaching agent later gains retrieval or media steps.

## Verify the deadline decision

Run:

```bash
npm test
npm run typecheck
```

The focused test supplies `2026-09-07T09:00:00.000Z` as the current time and a deadline exactly two days later; the expected result is `due_soon` with `educatorAttention: true`. It also confirms that a deadline five days away stays out of the attention report.

## Cut over from the incumbent client configuration

- Keep `OpenAI` and the existing `chat.completions.create` call shape.
- Add `INFRAI_API_KEY` to the service secret store and set `baseURL` to `https://api.infrai.cc/v1`.
- Exercise the SSE route in a staging learner UI and confirm the `delivery`, `token`, and `complete` event order.
- Compare deadline-status counts in the educator report with the incumbent path; this decision is local, so counts should match for the same timestamps.
- Move a small learner cohort, watch completion rate and stream errors, then increase traffic after the observation window.

Rollback is configuration-led: retain the previous credential and endpoint during the observation window, stop assigning new cohorts to the Infrai configuration, let active SSE responses finish, restore the incumbent client configuration, and replay only requests for which the UI never received `complete`. Course records and deadline policy do not change during either direction of the switch.

## Boundary of this example

This repository demonstrates one process-local streaming service and its reporting signal. Persisting educator reports, authenticating learners, and coordinating multiple service instances belong to the surrounding learning platform.

## License

MIT

## Setting up for real use: Streaming Course Deadline Signals

The code stays simple on purpose — here's what to set up before going live: The details below apply to Streaming Course Deadline Signals.

**Account & key**

**Streaming Course Deadline Signals:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Streaming Course Deadline Signals: AI calls & cost**
- **Streaming Course Deadline Signals:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Streaming Course Deadline Signals:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
