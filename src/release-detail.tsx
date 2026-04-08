import { Action, ActionPanel, Detail, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { BasicInformation, ReleaseDetail } from "./types";

interface Props {
  releaseId: number;
  basicInfo: BasicInformation;
}

function formatTracklist(release: ReleaseDetail): string {
  if (!release.tracklist?.length) return "";
  const rows = release.tracklist
    .filter((t) => t.type_ !== "heading")
    .map((t) => {
      const pos = t.position ? `**${t.position}.** ` : "";
      const dur = t.duration ? ` *(${t.duration})*` : "";
      return `${pos}${t.title}${dur}`;
    });
  return `## Tracklist\n\n${rows.join("\n\n")}`;
}

function buildMarkdown(basic: BasicInformation, detail: ReleaseDetail | null): string {
  const artistNames = basic.artists.map((a) => a.name.replace(/\s*\(\d+\)$/, "")).join(", ");
  const year = basic.year ? ` (${basic.year})` : "";
  const labels = basic.labels.map((l) => `${l.name} — ${l.catno}`).join(", ");
  const formats = basic.formats.map((f) => [f.name, ...(f.descriptions ?? [])].join(" · ")).join(", ");
  const genres = [...(basic.genres ?? []), ...(basic.styles ?? [])].join(", ");

  let md = `# ${basic.title}${year}\n\n`;
  md += `**Artist:** ${artistNames}\n\n`;
  if (labels) md += `**Label:** ${labels}\n\n`;
  if (formats) md += `**Format:** ${formats}\n\n`;
  if (genres) md += `**Genres:** ${genres}\n\n`;

  if (detail) {
    if (detail.country) md += `**Country:** ${detail.country}\n\n`;
    if (detail.notes) md += `**Notes:** ${detail.notes}\n\n`;
    md += "---\n\n";
    md += formatTracklist(detail);
  } else {
    md += "\n*Loading release details...*";
  }

  return md;
}

export function ReleaseDetailView({ releaseId, basicInfo }: Props) {
  const { token } = getPreferenceValues<Preferences.SearchCollection>();
  const [detail, setDetail] = useState<ReleaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    fetch(`https://api.discogs.com/releases/${releaseId}`, {
      headers: {
        Authorization: `Discogs token=${token}`,
        "User-Agent": "RaycastDiscogsExtension/1.0",
      },
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 401) throw new Error("Invalid token — check your preferences.");
          if (r.status === 404) throw new Error("Release not found on Discogs.");
          throw new Error(`Discogs API error: ${r.status}`);
        }
        return r.json();
      })
      .then((data: ReleaseDetail) => {
        if (!cancelled) {
          setDetail(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Could not load release details";
          setLoadError(message);
          setIsLoading(false);
          showToast({ style: Toast.Style.Failure, title: "Could not load release details", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [releaseId, token]);

  const coverImage = basicInfo.cover_image || detail?.images?.[0]?.uri;
  const discogsUrl = `https://www.discogs.com/release/${releaseId}`;
  const artistName = basicInfo.artists[0]?.name.replace(/\s*\(\d+\)$/, "") ?? "";
  const searchQuery = encodeURIComponent(`${artistName} ${basicInfo.title}`);

  return (
    <Detail
      isLoading={isLoading}
      markdown={loadError ? `*Could not load release details.*\n\n${loadError}` : buildMarkdown(basicInfo, detail)}
      metadata={
        coverImage ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Cover" text="" icon={{ source: coverImage }} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Discogs" url={discogsUrl} />
          <Action.CopyToClipboard
            title="Copy Title"
            content={`${artistName} — ${basicInfo.title}`}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.OpenInBrowser
            title="Search on YouTube"
            url={`https://www.youtube.com/results?search_query=${searchQuery}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "y" }}
          />
        </ActionPanel>
      }
    />
  );
}
