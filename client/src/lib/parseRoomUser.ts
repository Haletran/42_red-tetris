export interface RoomUserInfo {
  room: string;
  username: string;
}

/**
 * Parses the format #room_name[user_name]
 * @param hashString - String in format #room_name[user_name]
 * @returns Object with room and username, or null if invalid
 */
export function parseRoomUser(hashString: string): RoomUserInfo | null {
  // Remove leading # if present
  const cleaned = hashString.startsWith('#') ? hashString.slice(1) : hashString;

  // Match pattern: room_name[user_name]
  const match = cleaned.match(/^([^\[]+)\[([^\]]+)\]$/);

  if (!match) {
    return null;
  }

  return {
    room: match[1].trim(),
    username: match[2].trim(),
  };
}

/**
 * Creates a room/user string in format #room_name[user_name]
 */
export function formatRoomUser(room: string, username: string): string {
  return `#${room}[${username}]`;
}
