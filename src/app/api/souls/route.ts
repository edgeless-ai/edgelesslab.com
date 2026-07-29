export const dynamic = "force-static";

export function GET() {
  return Response.json({
    souls: [],
    count: 0,
    available: false,
    message: "The Soul Factory is a local lab service and is not exposed by the public site.",
  });
}
