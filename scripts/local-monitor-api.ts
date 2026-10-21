
import { createServer } from "node:http";
import { handler as createHandler } from "../services/api/src/handlers/monitors/create.ts";
import { handler as getHandler } from "../services/api/src/handlers/monitors/get.ts";

const userId = process.env.LOCAL_USER_ID ?? "localstack-user-123";

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const match = url.pathname.match(/^\/monitors\/([^/]+)$/);
  const headers = { "content-type": "application/json" };

  try {
    let result;

    if (req.method === "POST" && url.pathname === "/monitors") {
      let body = "";
      for await (const chunk of req) body += chunk.toString();

      result = await createHandler({
        body,
        requestContext: {
          authorizer: { claims: { sub: userId } },
        },
      });
    } else if (req.method === "GET" && match) {
      result = await getHandler({
        pathParameters: { monitorId: decodeURIComponent(match[1]) },
        requestContext: {
          authorizer: { claims: { sub: userId } },
        },
      });
    } else {
      result = {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "Route not found." }),
      };
    }

    res.writeHead(result.statusCode, result.headers);
    res.end(result.body);
  } catch {
    res.writeHead(500, headers);
    res.end(JSON.stringify({ message: "Local server error." }));
  }
});

server.listen(3000, () => {
  console.log("Local monitor API listening on http://localhost:3000");
});
