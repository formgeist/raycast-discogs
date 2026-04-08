/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Discogs Username - Your Discogs username */
  "username": string,
  /** Personal Access Token - Generate one at discogs.com/settings/developers */
  "token": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-collection` command */
  export type SearchCollection = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-collection` command */
  export type SearchCollection = {}
}

