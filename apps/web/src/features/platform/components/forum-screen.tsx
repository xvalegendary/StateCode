"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { BellRing, MessageSquareText, Radio, Send, ShieldPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AuthSession,
  readAuthSession,
  subscribeToAuthSession
} from "@/features/auth/lib/session";
import { cn } from "@/lib/utils";

type ForumViewer = {
  user_id: string;
  username: string;
  title: string;
  role: string;
  region_code: string;
  can_create_topics: boolean;
};

type ForumPost = {
  post_id: string;
  topic_id: string;
  body: string;
  created_at: string;
  created_by: ForumViewer;
  reactions: Record<string, string[]>;
};

type ForumTopic = {
  topic_id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: ForumViewer;
  reactions: Record<string, string[]>;
  posts: ForumPost[];
};

type ForumSnapshot = {
  type: "forum_snapshot";
  viewer: ForumViewer | null;
  selected_topic_id: string | null;
  topics: ForumTopic[];
};

type ForumError = {
  type: "forum_error";
  message: string;
};

const REACTION_PRESETS = ["useful", "fire", "agree", "watch"] as const;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function toWebSocketUrl(baseUrl: string) {
  if (baseUrl.startsWith("https://")) {
    return `wss://${baseUrl.slice("https://".length)}`;
  }

  if (baseUrl.startsWith("http://")) {
    return `ws://${baseUrl.slice("http://".length)}`;
  }

  return `ws://${baseUrl}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function ForumScreen() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [snapshot, setSnapshot] = useState<ForumSnapshot | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<"connecting" | "live" | "offline">(
    "connecting"
  );
  const [error, setError] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicTags, setTopicTags] = useState("");
  const [topicBody, setTopicBody] = useState("");
  const [postBody, setPostBody] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);

  useEffect(() => {
    const syncSession = () => setSession(readAuthSession());
    syncSession();
    return subscribeToAuthSession(syncSession);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      const params = new URLSearchParams();
      if (session?.token) {
        params.set("token", session.token);
      }
      if (selectedTopicId) {
        params.set("topicId", selectedTopicId);
      }

      const websocketUrl = `${toWebSocketUrl(API_BASE_URL)}/forum/ws${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const socket = new WebSocket(websocketUrl);
      socketRef.current = socket;
      setConnectionState("connecting");

      socket.onopen = () => {
        if (cancelled) {
          return;
        }
        setConnectionState("live");
        setError(null);
        socket.send(JSON.stringify({ type: "request_snapshot" }));
        if (selectedTopicId) {
          socket.send(JSON.stringify({ type: "select_topic", topicId: selectedTopicId }));
        }
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data as string) as ForumSnapshot | ForumError;
        if (payload.type === "forum_error") {
          setError(payload.message);
          return;
        }

        setSnapshot(payload);
        setSelectedTopicId((current) => current ?? payload.selected_topic_id);
      };

      socket.onerror = () => {
        setError("Forum websocket failed to connect.");
      };

      socket.onclose = () => {
        if (cancelled) {
          return;
        }
        setConnectionState("offline");
        reconnectRef.current = window.setTimeout(connect, 1500);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectRef.current !== null) {
        window.clearTimeout(reconnectRef.current);
      }
      socketRef.current?.close();
    };
  }, [session?.token]);

  const selectedTopic =
    snapshot?.topics.find((topic) => topic.topic_id === selectedTopicId) ?? snapshot?.topics[0] ?? null;

  useEffect(() => {
    if (selectedTopic && selectedTopic.topic_id !== selectedTopicId) {
      setSelectedTopicId(selectedTopic.topic_id);
    }
  }, [selectedTopic, selectedTopicId]);

  const sendMessage = (payload: unknown) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("Forum websocket is not connected.");
      return false;
    }

    socket.send(JSON.stringify(payload));
    return true;
  };

  const handleCreateTopic = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sent = sendMessage({
      type: "create_topic",
      title: topicTitle,
      body: topicBody,
      tags: topicTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    });
    if (!sent) {
      return;
    }

    setTopicTitle("");
    setTopicTags("");
    setTopicBody("");
  };

  const handleCreatePost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTopic) {
      return;
    }
    const sent = sendMessage({
      type: "create_post",
      topicId: selectedTopic.topic_id,
      body: postBody
    });
    if (!sent) {
      return;
    }

    setPostBody("");
  };

  const renderReactionRow = (topicId: string, reactions: Record<string, string[]>, postId?: string) => {
    const viewerUserId = snapshot?.viewer?.user_id ?? "";
    const keys = [...REACTION_PRESETS, ...Object.keys(reactions).filter((key) => !REACTION_PRESETS.includes(key as typeof REACTION_PRESETS[number]))];

    return (
      <div className="flex flex-wrap gap-2">
        {keys.map((reaction) => {
          const voters = reactions[reaction] ?? [];
          const active = viewerUserId ? voters.includes(viewerUserId) : false;

          return (
            <Button
              key={`${postId ?? topicId}-${reaction}`}
              type="button"
              variant={active ? "default" : "outline"}
              size="xs"
              onClick={() =>
                sendMessage({
                  type: "toggle_reaction",
                  topicId,
                  postId,
                  reaction
                })
              }
            >
              {reaction}
              <span className="text-[10px] text-current/80">{voters.length}</span>
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-8 lg:px-10">
      <section className="mx-auto flex max-w-[1320px] flex-col gap-8">
        <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Forum</Badge>
              <Badge variant={connectionState === "live" ? "default" : "outline"}>
                <Radio className="size-3" />
                {connectionState}
              </Badge>
              <Badge variant="outline">
                {snapshot?.topics.length ?? 0} topics
              </Badge>
            </div>
            <div className="space-y-2">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
                Official StateCode forum for announcements, discussion, and live moderation.
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                Topics are opened by moderators and administrators, while replies and reactions
                stay synchronized in real time for every connected participant.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {snapshot?.viewer ? snapshot.viewer.username : "Guest"}
            </Badge>
            <Badge variant="outline">
              {snapshot?.viewer?.role ?? "read-only"}
            </Badge>
          </div>
        </div>

        {error ? (
          <div className="border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-6">
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BellRing className="size-4 text-muted-foreground" />
                  Live topics
                </CardTitle>
                <CardDescription>
                  New forum state is broadcast to all connected viewers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {snapshot?.topics.length ? (
                  snapshot.topics.map((topic) => {
                    const active = topic.topic_id === selectedTopic?.topic_id;
                    return (
                      <button
                        key={topic.topic_id}
                        type="button"
                        className={cn(
                          "flex w-full flex-col gap-3 border px-4 py-4 text-left transition-colors",
                          active ? "border-border bg-muted" : "border-border/70 hover:bg-muted/50"
                        )}
                        onClick={() => {
                          setSelectedTopicId(topic.topic_id);
                          sendMessage({ type: "select_topic", topicId: topic.topic_id });
                        }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-foreground">{topic.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {topic.created_by.username} · {formatTime(topic.updated_at)}
                            </div>
                          </div>
                          <Badge variant="outline">{topic.posts.length} replies</Badge>
                        </div>
                        <div className="line-clamp-2 text-sm text-muted-foreground">
                          {topic.body}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {topic.tags.map((tag) => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="border px-4 py-6 text-sm text-muted-foreground">
                    Forum is empty. Staff can open the first topic.
                  </div>
                )}
              </CardContent>
            </Card>

            {snapshot?.viewer?.can_create_topics ? (
              <Card className="border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldPlus className="size-4 text-muted-foreground" />
                    Create topic
                  </CardTitle>
                  <CardDescription>
                    Visible only to moderators and administrators.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={handleCreateTopic}>
                    <Input
                      value={topicTitle}
                      onChange={(event) => setTopicTitle(event.target.value)}
                      placeholder="Topic title"
                    />
                    <Input
                      value={topicTags}
                      onChange={(event) => setTopicTags(event.target.value)}
                      placeholder="Tags, comma separated"
                    />
                    <textarea
                      value={topicBody}
                      onChange={(event) => setTopicBody(event.target.value)}
                      placeholder="Write the topic body"
                      className="min-h-32 w-full border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
                    />
                    <Button type="submit" className="w-full">
                      Publish topic
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Card className="border bg-card">
            <CardHeader>
              {selectedTopic ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Selected topic</Badge>
                    {selectedTopic.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{selectedTopic.title}</CardTitle>
                    <CardDescription>
                      {selectedTopic.created_by.username} · {selectedTopic.created_by.role} ·{" "}
                      {formatTime(selectedTopic.created_at)}
                    </CardDescription>
                  </div>
                </div>
              ) : (
                <div>
                  <CardTitle className="text-xl">No topic selected</CardTitle>
                  <CardDescription>Choose a topic from the left panel.</CardDescription>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedTopic ? (
                <>
                  <div className="space-y-3 border px-4 py-4">
                    <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {selectedTopic.body}
                    </div>
                    {renderReactionRow(selectedTopic.topic_id, selectedTopic.reactions)}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">Thread</div>
                      <Badge variant="outline">
                        {selectedTopic.posts.length} messages
                      </Badge>
                    </div>
                    {selectedTopic.posts.length ? (
                      selectedTopic.posts.map((post, index) => (
                        <div key={post.post_id} className="space-y-3">
                          <div className="border px-4 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-medium">{post.created_by.username}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatTime(post.created_at)}
                              </div>
                            </div>
                            <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                              {post.body}
                            </div>
                            <div className="mt-3">
                              {renderReactionRow(selectedTopic.topic_id, post.reactions, post.post_id)}
                            </div>
                          </div>
                          {index < selectedTopic.posts.length - 1 ? <Separator /> : null}
                        </div>
                      ))
                    ) : (
                      <div className="border px-4 py-6 text-sm text-muted-foreground">
                        No replies yet. Add the first message below.
                      </div>
                    )}
                  </div>

                  <form className="space-y-3 border px-4 py-4" onSubmit={handleCreatePost}>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquareText className="size-4 text-muted-foreground" />
                      Reply to thread
                    </div>
                    <textarea
                      value={postBody}
                      onChange={(event) => setPostBody(event.target.value)}
                      placeholder={
                        snapshot?.viewer
                          ? "Write a reply for the selected topic"
                          : "Log in to post replies"
                      }
                      disabled={!snapshot?.viewer}
                      className="min-h-32 w-full border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        {snapshot?.viewer
                          ? "Replies and reactions are sent through the websocket stream."
                          : "Guests can read the forum but cannot reply or react."}
                      </div>
                      <Button type="submit" disabled={!snapshot?.viewer}>
                        Post reply
                        <Send className="size-4" />
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="border px-4 py-10 text-sm text-muted-foreground">
                  The forum is connected, but there is no topic to display yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
