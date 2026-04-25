import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";

export type ForumUserRecord = {
  user_id: string;
  username: string;
  title: string;
  role: string;
  region_code: string;
  is_banned: boolean;
};

export type ForumViewer = {
  user_id: string;
  username: string;
  title: string;
  role: string;
  region_code: string;
  can_create_topics: boolean;
};

type ForumReactionSet = Record<string, Set<string>>;

type ForumPost = {
  post_id: string;
  topic_id: string;
  body: string;
  created_at: string;
  created_by: ForumViewer;
  reactions: ForumReactionSet;
};

type ForumTopic = {
  topic_id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: ForumViewer;
  reactions: ForumReactionSet;
  posts: ForumPost[];
};

type ForumTopicWire = {
  topic_id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: ForumViewer;
  reactions: Record<string, string[]>;
  posts: Array<{
    post_id: string;
    topic_id: string;
    body: string;
    created_at: string;
    created_by: ForumViewer;
    reactions: Record<string, string[]>;
  }>;
};

type ForumMessage =
  | {
      type: "create_topic";
      title?: string;
      body?: string;
      tags?: string[];
    }
  | {
      type: "create_post";
      topicId?: string;
      body?: string;
    }
  | {
      type: "toggle_reaction";
      topicId?: string;
      postId?: string;
      reaction?: string;
    }
  | {
      type: "select_topic";
      topicId?: string;
    }
  | {
      type: "request_snapshot";
    };

type ForumSocketClient = {
  client_id: string;
  socket: Socket;
  buffer: Buffer;
  viewer: ForumViewer | null;
  selected_topic_id: string | null;
};

function roleCanCreateTopic(role: string) {
  return role === "moderator" || role === "admin";
}

function normalizeViewer(user: ForumUserRecord): ForumViewer {
  return {
    user_id: user.user_id,
    username: user.username,
    title: user.title,
    role: user.role,
    region_code: user.region_code,
    can_create_topics: roleCanCreateTopic(user.role)
  };
}

function createReactionSummary(source: ForumReactionSet) {
  return Object.entries(source)
    .filter(([, userIds]) => userIds.size > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .reduce<Record<string, string[]>>((summary, [reaction, userIds]) => {
      summary[reaction] = [...userIds];
      return summary;
    }, {});
}

function nowIso() {
  return new Date().toISOString();
}

function topicToWire(topic: ForumTopic): ForumTopicWire {
  return {
    topic_id: topic.topic_id,
    title: topic.title,
    body: topic.body,
    tags: topic.tags,
    created_at: topic.created_at,
    updated_at: topic.updated_at,
    created_by: topic.created_by,
    reactions: createReactionSummary(topic.reactions),
    posts: topic.posts.map((post) => ({
      post_id: post.post_id,
      topic_id: post.topic_id,
      body: post.body,
      created_at: post.created_at,
      created_by: post.created_by,
      reactions: createReactionSummary(post.reactions)
    }))
  };
}

function normalizeTags(input: string[] | undefined) {
  const tags = Array.isArray(input) ? input : [];
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeReaction(input: string | undefined) {
  const reaction = (input ?? "").trim().slice(0, 16);
  if (!reaction) {
    return "";
  }

  if (!/^[\w+!?-]+$/i.test(reaction)) {
    return "";
  }

  return reaction.toLowerCase();
}

function seedTopics() {
  const staff = normalizeViewer({
    user_id: "forum-seed-admin",
    username: "@statecode-admin",
    title: "Platform Administrator",
    role: "admin",
    region_code: "UN",
    is_banned: false
  });
  const moderator = normalizeViewer({
    user_id: "forum-seed-mod",
    username: "@queue-marshal",
    title: "Moderator",
    role: "moderator",
    region_code: "DE",
    is_banned: false
  });
  const topicA = {
    topic_id: "topic-announcements",
    title: "Contest announcement stream",
    body:
      "Moderators can pin round notes here. Use this thread for rule clarifications, start delays, and queue incidents.",
    tags: ["Announcements", "Rounds"],
    created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    created_by: staff,
    reactions: {
      useful: new Set(["forum-seed-mod"])
    },
    posts: [
      {
        post_id: "post-announcements-1",
        topic_id: "topic-announcements",
        body: "Queue stabilized after warm-up. KPL2 capacity is back to nominal throughput.",
        created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        created_by: moderator,
        reactions: {
          useful: new Set(["forum-seed-admin"])
        }
      }
    ]
  } satisfies ForumTopic;

  const topicB = {
    topic_id: "topic-language-requests",
    title: "Language support requests",
    body:
      "Collect missing runtimes, editor snippets, and sandbox feedback here before adding new language presets.",
    tags: ["Languages", "Sandbox"],
    created_at: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    created_by: moderator,
    reactions: {
      fire: new Set(["forum-seed-admin"])
    },
    posts: []
  } satisfies ForumTopic;

  return [topicA, topicB];
}

export class ForumService {
  private readonly topics = new Map<string, ForumTopic>();
  private readonly clients = new Map<string, ForumSocketClient>();

  constructor() {
    for (const topic of seedTopics()) {
      this.topics.set(topic.topic_id, topic);
    }
  }

  async resolveViewer(
    token: string,
    getCurrentUser: (token: string) => Promise<ForumUserRecord>
  ) {
    const trimmed = token.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const user = await getCurrentUser(trimmed);
      if (user.is_banned) {
        return null;
      }

      return normalizeViewer(user);
    } catch {
      return null;
    }
  }

  attachSocket(request: IncomingMessage, socket: Socket, viewer: ForumViewer | null) {
    const key = request.headers["sec-websocket-key"];
    if (!key || Array.isArray(key)) {
      socket.destroy();
      return;
    }

    const acceptKey = createHash("sha1")
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest("base64");

    socket.write(
      [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${acceptKey}`,
        "",
        ""
      ].join("\r\n")
    );

    const url = new URL(request.url ?? "/forum/ws", "http://localhost");
    const selectedTopicId = url.searchParams.get("topicId");
    const client: ForumSocketClient = {
      client_id: randomUUID(),
      socket,
      buffer: Buffer.alloc(0),
      viewer,
      selected_topic_id: selectedTopicId
    };
    this.clients.set(client.client_id, client);
    this.sendSnapshot(client);

    socket.on("data", (chunk) => {
      client.buffer = Buffer.concat([client.buffer, chunk]);
      this.drainBuffer(client);
    });

    socket.on("close", () => {
      this.clients.delete(client.client_id);
    });

    socket.on("end", () => {
      this.clients.delete(client.client_id);
    });

    socket.on("error", () => {
      this.clients.delete(client.client_id);
    });
  }

  private broadcastSnapshots() {
    for (const client of this.clients.values()) {
      this.sendSnapshot(client);
    }
  }

  private forumSnapshot(client: ForumSocketClient) {
    const sortedTopics = [...this.topics.values()]
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .map(topicToWire);

    const selected =
      client.selected_topic_id && this.topics.has(client.selected_topic_id)
        ? client.selected_topic_id
        : sortedTopics[0]?.topic_id ?? null;

    return {
      type: "forum_snapshot",
      viewer: client.viewer,
      selected_topic_id: selected,
      topics: sortedTopics
    };
  }

  private sendJson(socket: Socket, payload: unknown) {
    const body = Buffer.from(JSON.stringify(payload), "utf8");
    socket.write(this.encodeFrame(body));
  }

  private sendSnapshot(client: ForumSocketClient) {
    this.sendJson(client.socket, this.forumSnapshot(client));
  }

  private sendError(client: ForumSocketClient, message: string) {
    this.sendJson(client.socket, {
      type: "forum_error",
      message
    });
  }

  private drainBuffer(client: ForumSocketClient) {
    while (client.buffer.length >= 2) {
      const frame = client.buffer;
      const firstByte = client.buffer[0] ?? 0;
      const secondByte = client.buffer[1] ?? 0;
      const opcode = firstByte & 0x0f;
      let payloadLength = secondByte & 0x7f;
      let offset = 2;

      if (payloadLength === 126) {
        if (client.buffer.length < 4) {
          return;
        }
        payloadLength = client.buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (client.buffer.length < 10) {
          return;
        }
        const high = client.buffer.readUInt32BE(2);
        const low = client.buffer.readUInt32BE(6);
        payloadLength = high * 2 ** 32 + low;
        offset = 10;
      }

      const masked = (secondByte & 0x80) !== 0;
      const maskBytes = masked ? 4 : 0;
      const frameLength = offset + maskBytes + payloadLength;
      if (client.buffer.length < frameLength) {
        return;
      }

      const maskStart = offset;
      const payloadStart = offset + maskBytes;
      const payload = frame.subarray(payloadStart, payloadStart + payloadLength);
      const maskKey = masked ? frame.subarray(maskStart, maskStart + 4) : null;
      client.buffer = client.buffer.subarray(frameLength);

      let data = Buffer.from(payload);
      if (masked && maskKey) {
        for (let index = 0; index < data.length; index += 1) {
          data[index] = (data[index] ?? 0) ^ (maskKey[index % 4] ?? 0);
        }
      }

      if (opcode === 0x8) {
        client.socket.end(this.encodeControlFrame(0x8));
        this.clients.delete(client.client_id);
        return;
      }

      if (opcode === 0x9) {
        client.socket.write(this.encodeControlFrame(0xA, data));
        continue;
      }

      if (opcode !== 0x1) {
        continue;
      }

      try {
        const message = JSON.parse(data.toString("utf8")) as ForumMessage;
        this.handleMessage(client, message);
      } catch {
        this.sendError(client, "invalid forum websocket payload");
      }
    }
  }

  private handleMessage(client: ForumSocketClient, message: ForumMessage) {
    switch (message.type) {
      case "request_snapshot": {
        this.sendSnapshot(client);
        return;
      }
      case "select_topic": {
        client.selected_topic_id = message.topicId?.trim() || null;
        this.sendSnapshot(client);
        return;
      }
      case "create_topic": {
        if (!client.viewer || !client.viewer.can_create_topics) {
          this.sendError(client, "moderator or admin role is required to create topics");
          return;
        }
        const title = (message.title ?? "").trim().slice(0, 120);
        const body = (message.body ?? "").trim().slice(0, 4000);
        if (!title || !body) {
          this.sendError(client, "topic title and body are required");
          return;
        }
        const createdAt = nowIso();
        const topic: ForumTopic = {
          topic_id: `topic-${randomUUID().slice(0, 8)}`,
          title,
          body,
          tags: normalizeTags(message.tags),
          created_at: createdAt,
          updated_at: createdAt,
          created_by: client.viewer,
          reactions: {},
          posts: []
        };
        this.topics.set(topic.topic_id, topic);
        client.selected_topic_id = topic.topic_id;
        this.broadcastSnapshots();
        return;
      }
      case "create_post": {
        if (!client.viewer) {
          this.sendError(client, "login is required to post in the forum");
          return;
        }
        const topicId = (message.topicId ?? "").trim();
        const body = (message.body ?? "").trim().slice(0, 4000);
        const topic = this.topics.get(topicId);
        if (!topic) {
          this.sendError(client, "topic not found");
          return;
        }
        if (!body) {
          this.sendError(client, "message body is required");
          return;
        }
        const createdAt = nowIso();
        topic.posts.push({
          post_id: `post-${randomUUID().slice(0, 8)}`,
          topic_id: topicId,
          body,
          created_at: createdAt,
          created_by: client.viewer,
          reactions: {}
        });
        topic.updated_at = createdAt;
        client.selected_topic_id = topicId;
        this.broadcastSnapshots();
        return;
      }
      case "toggle_reaction": {
        if (!client.viewer) {
          this.sendError(client, "login is required to react");
          return;
        }
        const reaction = normalizeReaction(message.reaction);
        if (!reaction) {
          this.sendError(client, "reaction key is invalid");
          return;
        }
        const topicId = (message.topicId ?? "").trim();
        const topic = this.topics.get(topicId);
        if (!topic) {
          this.sendError(client, "topic not found");
          return;
        }
        const target = message.postId
          ? topic.posts.find((post) => post.post_id === message.postId)?.reactions
          : topic.reactions;
        if (!target) {
          this.sendError(client, "reaction target not found");
          return;
        }
        const set = target[reaction] ?? new Set<string>();
        if (set.has(client.viewer.user_id)) {
          set.delete(client.viewer.user_id);
        } else {
          set.add(client.viewer.user_id);
        }
        if (set.size === 0) {
          delete target[reaction];
        } else {
          target[reaction] = set;
        }
        topic.updated_at = nowIso();
        this.broadcastSnapshots();
        return;
      }
      default: {
        this.sendError(client, "unsupported forum action");
      }
    }
  }

  private encodeControlFrame(opcode: number, payload = Buffer.alloc(0)) {
    return this.encodeFrame(payload, opcode);
  }

  private encodeFrame(payload: Buffer, opcode = 0x1) {
    const length = payload.length;
    if (length < 126) {
      return Buffer.concat([Buffer.from([0x80 | opcode, length]), payload]);
    }

    if (length < 65536) {
      const header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
      return Buffer.concat([header, payload]);
    }

    const header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeUInt32BE(Math.floor(length / 2 ** 32), 2);
    header.writeUInt32BE(length >>> 0, 6);
    return Buffer.concat([header, payload]);
  }
}

export function isWebSocketUpgrade(request: IncomingMessage, pathname: string) {
  const upgrade = request.headers.upgrade;
  if (!upgrade || Array.isArray(upgrade)) {
    return false;
  }
  return pathname === "/forum/ws" && upgrade.toLowerCase() === "websocket";
}
