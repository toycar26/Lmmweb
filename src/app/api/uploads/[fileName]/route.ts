import { NextResponse, type NextRequest } from "next/server";
import { getSiteCloudflareEnv } from "@/lib/runtime-env";
import { promises as fs } from "fs";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> },
) {
  const { fileName } = await params;
  const env = await getSiteCloudflareEnv();

  if (!env?.SITE_UPLOADS) {
    const { fileName } = await params;
    const localPath = path.join(process.cwd(), "public", "uploads", fileName);

    try {
      const buffer = await fs.readFile(localPath);
      return new NextResponse(buffer, {
        headers: {
          "content-type": "image/jpeg",
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
  }

  const object = await env.SITE_UPLOADS.get(fileName);
  if (!object) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new NextResponse(object.body, {
    headers,
  });
}
