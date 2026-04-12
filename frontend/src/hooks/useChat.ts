'use client';

import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { sendChatMessage } from '@/lib/api';
import { ConversationMessage, Message, Source } from '@/lib/types';

function buildWelcomeMessage(personaName: string) {
  return `I am **RORI**, ${personaName}'s loyal ship AI. I can tell you about his background, his skills, and schedule a rendezvous!\n\nSet course and ask me about his background, skills, or projects...`;
}

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

export function useChat(personaName = 'this candidate') {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: buildWelcomeMessage(personaName),
      sources: [],
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => uuidv4());
  const [sources, setSources] = useState<Source[]>([]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content,
        sources: [],
        timestamp: new Date(),
      };

      const historyForApi: ConversationMessage[] = [
        ...messages
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({
            role: m.role,
            content: m.content,
          })),
        { role: 'user', content },
      ];

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await sendChatMessage({
          message: content,
          conversation_id: conversationId,
          conversation_history: historyForApi.slice(-10),
          timezone: getBrowserTimezone(),
        });

        const assistantContent =
          typeof response.message === 'string' ? response.message.trim() : '';

        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content:
            assistantContent ||
            "I found relevant context, but I couldn't generate a proper answer. Please try again.",
          sources: response.sources || [],
          bookingLink: response.booking_link || undefined,
          availableSlots: response.available_slots || undefined,
          timezone: response.timezone || undefined,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setSources(response.sources || []);
      } catch (error) {
        console.error('Chat error:', error);

        const errorMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content:
            "I'm sorry, I encountered an error processing your message. Please try again.",
          sources: [],
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, conversationId]
  );

  useEffect(() => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === 'welcome'
          ? { ...message, content: buildWelcomeMessage(personaName) }
          : message
      )
    );
  }, [personaName]);

  return {
    messages,
    isLoading,
    sendMessage,
    sources,
  };
}
