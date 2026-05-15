import { NextResponse } from "next/server";
import { projects } from "@/lib/data";

/**
 * Note: This API route is used in development.
 * In production (static export), the client falls back to static data.
 */
export const dynamic = "force-static";

/**
 * GET /api/projects/live
 * Returns live project data for the homepage showcase.
 */
export async function GET() {
  try {
    // In production, this could:
    // 1. Read from a cache (Redis, Upstash)
    // 2. Query GitHub API for commit counts
    // 3. Query Paperclip API for recently shipped issues
    // 4. Query Obsidian vault for project documentation updates

    // For now, enhance static data with metadata
    const enhancedProjects = projects.map((p) => ({
      ...p,
      agentUpdated: true,
      lastUpdated: new Date().toISOString(),
    }));

    return NextResponse.json({
      projects: enhancedProjects.slice(0, 3),
      lastSync: new Date().toISOString(),
      count: enhancedProjects.length,
    }, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/live
 * Webhook endpoint for agents to trigger project updates.
 * Accepts updates from Paperclip, GitHub webhooks, or agent scripts.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the update payload
    if (!body.source || !body.projects) {
      return NextResponse.json(
        { error: "Invalid payload: requires 'source' and 'projects'" },
        { status: 400 }
      );
    }

    // Log the update (in production, write to cache/DB)
    console.log("[Projects API] Update received from:", body.source);
    console.log("[Projects API] Projects updated:", body.projects.length);

    // TODO: Write to cache (Redis, Vercel KV, etc.)
    // TODO: Revalidate Next.js cache for projects pages

    return NextResponse.json({
      success: true,
      receivedAt: new Date().toISOString(),
      projectsUpdated: body.projects.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process update" },
      { status: 500 }
    );
  }
}
