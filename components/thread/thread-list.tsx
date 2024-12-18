import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListPlus, Check, X, Pin, PinOff, Trash } from "lucide-react";
import { Thread } from "@/components/types";

interface ThreadListProps {
  threads: Thread[];
  currentThread: string | null;
  editingThreadTitle: string | null;
  addThread: () => void;
  setCurrentThread: (id: string | null) => void;
  setSelectedMessage: (id: string | null) => void;
  cancelEditThreadTitle: () => void;
  setThreads: React.Dispatch<React.SetStateAction<Thread[]>>;
  confirmEditThreadTitle: (id: string, title: string) => void;
  startEditingThreadTitle: (id: string, title: string) => void;
  toggleThreadPin: (id: string) => void;
  deleteThread: (id: string) => void;
  threadToDelete: string | null;
  setThreadToDelete: React.Dispatch<React.SetStateAction<string | null>>;
}

const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  currentThread,
  editingThreadTitle,
  addThread,
  setCurrentThread,
  setSelectedMessage,
  cancelEditThreadTitle,
  setThreads,
  confirmEditThreadTitle,
  startEditingThreadTitle,
  toggleThreadPin,
  threadToDelete,
  setThreadToDelete,
  deleteThread,
}) => {
  const threadTitleInputRef = useRef<HTMLInputElement>(null);

  // Sort threads with newer threads (higher id) at the top, and pinned threads taking precedence
  const sortedThreads = threads.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return parseInt(b.id) - parseInt(a.id);
  });

  return (
    <div className="flex flex-col relative h-[calc(97vh)]">
      <div
        className="top-bar bg-gradient-to-b from-background/100 to-background/00 select-none"
        style={{
          mask: "linear-gradient(black, black, transparent)",
          backdropFilter: "blur(1px)",
        }}
      >
        <h2 className="text-2xl font-serif font-bold pl-2">Threads</h2>
        <Button
          className="bg-background hover:bg-secondary custom-shadow transition-scale-zoom text-primary border border-border"
          size="default"
          onClick={() => {
            addThread();
            setSelectedMessage(null);
          }}
        >
          <ListPlus className="h-4 w-4" />
          <span className="ml-2 hidden md:inline">New Thread</span>
        </Button>
      </div>
      <ScrollArea
        className="flex-auto"
        onClick={() => {
          setCurrentThread(null);
          if (editingThreadTitle) {
            cancelEditThreadTitle();
          }
        }}
      >
        <AnimatePresence>
          <motion.div className="my-2">
            {sortedThreads.map((thread) => (
              <motion.div
                key={thread.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                whileHover={{
                  y: -2,
                }}
                className={`
                  select-none
                  font-serif
                  pl-1
                  cursor-pointer
                  rounded-md
                  mb-2
                  md:hover:shadow-[inset_0_0_10px_10px_rgba(128,128,128,0.2)]
                  active:shadow-[inset_0px_0px_10px_rgba(0,0,0,0.7)]
                  ${
                  currentThread === thread.id
                    ? "bg-background custom-shadow"
                    : "bg-transparent text-muted-foreground"
                  }
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentThread(thread.id);
                }}
              >
                <div className="flex-grow group">
                  {editingThreadTitle === thread.id ? (
                    <div className="flex items-center justify-between">
                      <Input
                        ref={threadTitleInputRef}
                        value={thread.title}
                        onChange={(e) =>
                          setThreads((prev) =>
                            prev.map((t) =>
                              t.id === thread.id
                                ? { ...t, title: e.target.value }
                                : t
                            )
                          )
                        }
                        className="min-font-size flex-grow h-8 p-1 my-1"
                        onClick={(e) => e.stopPropagation()}
                        maxLength={64}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            confirmEditThreadTitle(thread.id, thread.title);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            cancelEditThreadTitle();
                          }
                        }}
                      />
                      <div className="flex items-center">
                      <Button
                          size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmEditThreadTitle(thread.id, thread.title);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                          size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEditThreadTitle();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-between"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startEditingThreadTitle(thread.id, thread.title);
                      }}
                    >
                      <span className="pl-1 flex-grow">{thread.title}</span>
                        <div className="flex items-center">
                          <div className="group/pin">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleThreadPin(thread.id);
                              }}
                            >
                              {thread.isPinned ? (
                                <>
                                  <Pin className="h-4 w-4 hidden md:block md:group-hover/pin:hidden" />
                                  <PinOff className="h-4 w-4 md:hidden md:group-hover/pin:block" />
                                </>
                              ) : (
                                  <Pin className="h-4 w-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
                              )}
                            </Button>
                          </div>
                          <div className="md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            {threadToDelete === thread.id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteThread(thread.id);
                                    setThreadToDelete(null);
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setThreadToDelete(null);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setThreadToDelete(thread.id);
                                  }}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                            )}
                          </div>
                        </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
};

export default ThreadList;
