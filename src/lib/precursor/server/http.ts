export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: e instanceof Error ? e.message : "Something went wrong on the server." }, { status: 500 });
}
