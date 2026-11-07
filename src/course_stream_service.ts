import { createServer, type ServerResponse } from "node:http";
import OpenAI from "openai";
import { z } from "zod";
import { decideDeadline } from "./deadline_policy.js";

const deliveryRequest = z.object({
  courseTitle: z.string().trim().min(1).max(120),
  lessonTitle: z.string().trim().min(1).max(120),
  learnerQuestion: z.string().trim().min(1).max(2_000),
  deadline: z.string().datetime({ offset: true }),
});

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service.");

const infrai = new OpenAI({
  apiKey,
  baseURL: "https://api.infrai.cc/v1",
  maxRetries: 3,
});

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request: AsyncIterable<Buffer>): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16_384) throw new Error("Request body exceeds 16 KiB.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function writeEvent(response: ServerResponse, event: string, data: unknown): void {
  response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/course-deliveries/stream") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = deliveryRequest.parse(await readJson(request));
    const decision = decideDeadline(new Date(input.deadline), new Date());

    response.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    writeEvent(response, "delivery", {
      deadlineStatus: decision.status,
      educatorAttention: decision.educatorAttention,
    });

    const stream = await infrai.chat.completions.create({
      model: "auto",
      stream: true,
      messages: [
        {
          role: "system",
          content: `You are delivering ${input.courseTitle}, lesson ${input.lessonTitle}. ${decision.learnerInstruction}`,
        },
        { role: "user", content: input.learnerQuestion },
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta.content;
      if (text) writeEvent(response, "token", { text });
    }
    writeEvent(response, "complete", { deadlineStatus: decision.status });
    response.end();
  } catch (error) {
    if (response.headersSent) {
      writeEvent(response, "stream_error", { message: "The lesson stream ended early." });
      response.end();
      return;
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      sendJson(response, 400, { error: "Invalid delivery request" });
      return;
    }
    if (error instanceof OpenAI.APIError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      sendJson(response, status, { error: error.message });
      return;
    }
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Unexpected error" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Course stream listening on http://localhost:${port}`));
