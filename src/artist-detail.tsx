import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ArtistRelease, ArtistReleasesResponse, CollectionItem } from "./types";

interface Props {
  artistId: number;
  artistName: string;
  collectionItems: CollectionItem[];
}

async function fetchAllArtistReleases(artistId: number, token: string): Promise<ArtistRelease[]> {
  const headers = {
    Authorization: `Discogs token=${token}`,
    "User-Agent": "RaycastDiscogsExtension/1.0",
  };

  const firstRes = await fetch(`https://api.discogs.com/artists/${artistId}/releases?per_page=100&page=1`, {
    headers,
  });

  if (!firstRes.ok) {
    if (firstRes.status === 404) throw new Error(`Artist not found on Discogs.`);
    throw new Error(`Discogs API error: ${firstRes.status}`);
  }

  const first: ArtistReleasesResponse = await firstRes.json();
  const allReleases: ArtistRelease[] = [...first.releases];
  const totalPages = first.pagination.pages;

  if (totalPages > 1) {
    const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    for (const page of pageNumbers) {
      const res = await fetch(`https://api.discogs.com/artists/${artistId}/releases?per_page=100&page=${page}`, {
        headers,
      });
      if (!res.ok) break;
      const data: ArtistReleasesResponse = await res.json();
      allReleases.push(...data.releases);
    }
  }

  return allReleases;
}

export function ArtistDetailView({ artistId, artistName, collectionItems }: Props) {
  const { token } = getPreferenceValues<Preferences.SearchCollection>();
  const [releases, setReleases] = useState<ArtistRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Collection stores specific release IDs. For masters, match via main_release.
  const collectionIds = new Set(collectionItems.map((item) => item.basic_information.id));

  function isOwned(release: ArtistRelease): boolean {
    if (release.type === "master") return release.main_release != null && collectionIds.has(release.main_release);
    return collectionIds.has(release.id);
  }

  useEffect(() => {
    let cancelled = false;

    fetchAllArtistReleases(artistId, token)
      .then((data) => {
        if (!cancelled) {
          // Keep only "Main" role; prefer masters (one per album) over individual pressings
          const mainReleases = data.filter((r) => r.role === "Main");
          setReleases(mainReleases);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Could not load artist releases";
          setIsLoading(false);
          showToast({ style: Toast.Style.Failure, title: "Could not load artist releases", message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [artistId, token]);

  const owned = releases.filter((r) => isOwned(r));
  const notOwned = releases.filter((r) => !isOwned(r));
  const discogsArtistUrl = `https://www.discogs.com/artist/${artistId}`;

  function releaseAccessories(release: ArtistRelease) {
    return release.year ? [{ text: String(release.year) }] : undefined;
  }

  function releaseIcon(release: ArtistRelease, inCollection: boolean) {
    if (release.thumb) {
      return { source: release.thumb, fallback: inCollection ? Icon.Checkmark : Icon.Music };
    }
    return inCollection ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Music;
  }

  function releaseUrl(release: ArtistRelease): string {
    return release.type === "master"
      ? `https://www.discogs.com/master/${release.id}`
      : `https://www.discogs.com/release/${release.id}`;
  }

  function ReleaseActions({ release }: { release: ArtistRelease }) {
    return (
      <ActionPanel>
        <Action.OpenInBrowser title="Open in Discogs" url={releaseUrl(release)} />
        <Action.Push
          title="View Artist"
          icon={Icon.Person}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          target={<ArtistDetailView artistId={artistId} artistName={artistName} collectionItems={collectionItems} />}
        />
        <Action.OpenInBrowser title="Open Artist on Discogs" url={discogsArtistUrl} />
      </ActionPanel>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle={artistName} searchBarPlaceholder="Search releases…">
      {!isLoading && owned.length === 0 && notOwned.length === 0 && (
        <List.EmptyView icon={Icon.Music} title="No releases found" description={`${artistName} has no releases on Discogs.`} />
      )}
      {owned.length > 0 && (
        <List.Section title="In Your Collection" subtitle={String(owned.length)}>
          {owned.map((release) => (
            <List.Item
              key={release.id}
              icon={releaseIcon(release, true)}
              title={release.title}
              accessories={releaseAccessories(release)}
              actions={<ReleaseActions release={release} />}
            />
          ))}
        </List.Section>
      )}
      {notOwned.length > 0 && (
        <List.Section title="Not in Collection" subtitle={String(notOwned.length)}>
          {notOwned.map((release) => (
            <List.Item
              key={release.id}
              icon={releaseIcon(release, false)}
              title={release.title}
              accessories={releaseAccessories(release)}
              actions={<ReleaseActions release={release} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
