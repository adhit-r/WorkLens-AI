import { Hono } from 'hono';
import { z } from 'zod';
import { UnifiedLLMClient } from '../llm';
import { Chatbot, ChatMode } from '../gemini/chatbot';
import { SQLEngine } from '../sql/engine';

const chat = new Hono();

const messageSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional(),
  mode: z.enum(['descriptive', 'diagnostic', 'prescriptive']).default('descriptive'),
  provider: z.string().optional(),
  model: z.string().optional(),
});

// Main chat endpoint
chat.post('/', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const body = await c.req.json();
  
  const { message, sessionId, mode, provider, model } = messageSchema.parse(body);

  const llm = new UnifiedLLMClient({
    provider: (provider || 'gemini') as any, // Default to gemini if not provided
    model: model || 'gemini-2.5-flash',
  });
  
  const sqlEngine = new SQLEngine(supabase);
  const chatbot = new Chatbot(llm, sqlEngine, supabase);

  const response = await chatbot.processMessage({
    message,
    sessionId,
    mode: mode as ChatMode,
    user,
  });

  return c.json(response);
});

// Get chat history for a session
chat.get('/history/:sessionId', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const sessionId = c.req.param('sessionId');

  const { data: messages, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    return c.json({ error: 'Failed to fetch chat history' }, 500);
  }

  return c.json({ messages });
});

// Get recent sessions
chat.get('/sessions', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const limit = parseInt(c.req.query('limit') || '10');

  const { data: sessions, error } = await supabase
    .from('chat_history')
    .select('session_id, created_at, content')
    .eq('user_id', user.id)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return c.json({ error: 'Failed to fetch sessions' }, 500);
  }

  // Group by session and get first message as preview
  const uniqueSessions = sessions?.reduce((acc, msg) => {
    if (!acc.find(s => s.sessionId === msg.session_id)) {
      acc.push({
        sessionId: msg.session_id,
        preview: msg.content.substring(0, 100),
        createdAt: msg.created_at,
      });
    }
    return acc;
  }, [] as { sessionId: string; preview: string; createdAt: string }[]);

  return c.json({ sessions: uniqueSessions });
});

// Quick queries (predefined common questions)
chat.get('/quick-queries', async (c) => {
  const quickQueries = [
    { id: 'my-tasks', label: 'What are my current tasks?', mode: 'descriptive' },
    { id: 'my-bandwidth', label: 'What is my bandwidth this week?', mode: 'descriptive' },
    { id: 'overdue-tasks', label: 'Show me overdue tasks', mode: 'descriptive' },
    { id: 'why-low-bandwidth', label: 'Why is my bandwidth low?', mode: 'diagnostic' },
    { id: 'at-risk-tasks', label: 'Which tasks are at risk of missing ETA?', mode: 'diagnostic' },
    { id: 'free-bandwidth', label: 'How can I free up bandwidth?', mode: 'prescriptive' },
    { id: 'team-overview', label: 'Show team workload overview', mode: 'descriptive' },
  ];

  return c.json({ queries: quickQueries });
});

export default chat;

