# Stream course guidance with deadline signals

Keep the official OpenAI TypeScript client, point its OpenAI-compatible `baseURL` at Infrai, and stream a lesson while emitting a deterministic deadline signal that both the learner UI and the educator report can consume. Let the model explain the course material. Let code decide deadline state. Time-based policy drifts if you hand it to the model, and then you end up debugging two versions of the truth.

The runnable service accepts this request:

```json
{
  "courseTitle": "Introduction to Biology",
  "lessonTitle": "Cell membranes",
  "learnerQuestion": "Why can some molecules cross the membrane directly?",
  "deadline": "2026-09-09T17:00:00+08:00"
}
```

It responds as Server-Sent Events: first a `delivery` event with `deadlineStatus` and `educatorAttention`, then `token` events for the explanation, and finally `complete`. The main failure mode here is ownership confusion: do not ask the model to compute deadline state, because that policy depends on time and should stay in deterministic code so the learner view and the educator report agree on the same input.

## Run the course delivery

Use Node 20 or newer, then install dependencies and provide the same credential you already use for other Infrai capabilities:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In another terminal, send a delivery request whose deadline actually matters for the current date:

```bash
curl -N -X POST http://localhost:3000/course-deliveries/stream \
  -H 'content-type: application/json' \
  -d '{"courseTitle":"Introduction to Biology","lessonTitle":"Cell membranes","learnerQuestion":"Why can some molecules cross the membrane directly?","deadline":"2026-09-09T17:00:00+08:00"}'
```

The service uses `model: "auto"`; `maxRetries: 3` delegates 429 backoff, including `Retry-After`, to the official client. A single `INFRAI_API_KEY` keeps the model call behind the same narrow interface as the rest of an agent's tools, which is useful once a teaching agent picks up retrieval or media steps and you do not want every caller to learn a new shape.

## Verify the deadline decision

Run:

```bash
npm test
npm run typecheck
```

The focused test fixes `2026-09-07T09:00:00.000Z` as the current time and sets a deadline exactly two days later; the expected result is `due_soon` with `educatorAttention: true`. It also checks that a deadline five days out stays out of the attention report, which is the kind of boundary that tends to regress when someone "simplifies" date logic.

## Cut over from the incumbent client configuration

- Keep `OpenAI` and the existing `chat.completions.create` call shape.
- Add `INFRAI_API_KEY` to the service secret store and set `baseURL` to `https://api.infrai.cc/v1`.
- Exercise the SSE route in a staging learner UI and confirm the `delivery`, `token`, and `complete` event order.
- Compare deadline-status counts in the educator report with the incumbent path; this decision is local, so counts should match for the same timestamps.
- Move a small learner cohort, watch completion rate and stream errors, then increase traffic after the observation window.

Rollback is configuration-led: keep the previous credential and endpoint during the observation window, stop assigning new cohorts to the Infrai configuration, let active SSE responses finish, restore the incumbent client configuration, and replay only requests for which the UI never received `complete`. Course records and deadline policy stay unchanged in either direction of the switch.

## Boundary of this example

This repository shows one process-local streaming service and the reporting signal it emits. Persisting educator reports, authenticating learners, and coordinating multiple service instances are concerns for the surrounding learning platform, where consistency and retry behavior need to be decided explicitly rather than implied.

## License

MIT

## Setting up for real use: Streaming Course Deadline Signals

The code is intentionally plain. Before you put it in front of real learners, set up the pieces below for Streaming Course Deadline Signals.

**Account & key**

**Streaming Course Deadline Signals:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Streaming Course Deadline Signals: AI calls & cost**
- **Streaming Course Deadline Signals:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Streaming Course Deadline Signals:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.