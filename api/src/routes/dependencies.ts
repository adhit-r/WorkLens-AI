import { Hono } from 'hono';
import { z } from 'zod';
import { SQLEngine } from '../sql/engine';

const dependencies = new Hono();

const createDependencySchema = z.object({
  parentTaskId: z.number(),
  childTaskId: z.number(),
  dependencyType: z.enum(['blocks', 'relates_to', 'duplicates']).default('blocks'),
});

// Get all dependencies for a project
dependencies.get('/project/:projectId', async (c) => {
  const supabase = c.get('supabase');
  const projectId = parseInt(c.req.param('projectId'));

  const engine = new SQLEngine(supabase);
  const deps = await engine.getProjectDependencies(projectId);

  return c.json(deps);
});

// Get dependency graph data (nodes and edges)
dependencies.get('/graph/:projectId', async (c) => {
  const supabase = c.get('supabase');
  const projectId = parseInt(c.req.param('projectId'));

  const engine = new SQLEngine(supabase);
  const graphData = await engine.getDependencyGraph(projectId);

  return c.json(graphData);
});

// Get dependencies for a specific task
dependencies.get('/task/:taskId', async (c) => {
  const supabase = c.get('supabase');
  const taskId = parseInt(c.req.param('taskId'));

  // Get tasks this task blocks
  const { data: blocking, error: blockingError } = await supabase
    .from('task_dependencies')
    .select(`
      id,
      dependency_type,
      child_task:mantis_bug_table!child_task_id (
        id,
        summary,
        status,
        handler_id
      )
    `)
    .eq('parent_task_id', taskId);

  // Get tasks blocking this task
  const { data: blockedBy, error: blockedByError } = await supabase
    .from('task_dependencies')
    .select(`
      id,
      dependency_type,
      parent_task:mantis_bug_table!parent_task_id (
        id,
        summary,
        status,
        handler_id
      )
    `)
    .eq('child_task_id', taskId);

  if (blockingError || blockedByError) {
    return c.json({ error: 'Failed to fetch dependencies' }, 500);
  }

  return c.json({
    blocking: blocking || [],
    blockedBy: blockedBy || [],
    blockingCount: blocking?.length || 0,
    blockedByCount: blockedBy?.length || 0,
  });
});

// Create a dependency
dependencies.post('/', async (c) => {
  const user = c.get('user');
  const supabase = c.get('supabase');
  const body = await c.req.json();
  
  const { parentTaskId, childTaskId, dependencyType } = createDependencySchema.parse(body);

  // Prevent self-dependency
  if (parentTaskId === childTaskId) {
    return c.json({ error: 'A task cannot depend on itself' }, 400);
  }

  // Check for circular dependency
  const { data: existing } = await supabase
    .from('task_dependencies')
    .select('id')
    .eq('parent_task_id', childTaskId)
    .eq('child_task_id', parentTaskId)
    .single();

  if (existing) {
    return c.json({ error: 'This would create a circular dependency' }, 400);
  }

  const { data, error } = await supabase
    .from('task_dependencies')
    .insert({
      parent_task_id: parentTaskId,
      child_task_id: childTaskId,
      dependency_type: dependencyType,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return c.json({ error: 'This dependency already exists' }, 400);
    }
    return c.json({ error: 'Failed to create dependency' }, 500);
  }

  return c.json(data, 201);
});

// Delete a dependency
dependencies.delete('/:dependencyId', async (c) => {
  const supabase = c.get('supabase');
  const dependencyId = c.req.param('dependencyId');

  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', dependencyId);

  if (error) {
    return c.json({ error: 'Failed to delete dependency' }, 500);
  }

  return c.json({ success: true });
});

// Get critical path for a project
dependencies.get('/critical-path/:projectId', async (c) => {
  const supabase = c.get('supabase');
  const projectId = parseInt(c.req.param('projectId'));

  const engine = new SQLEngine(supabase);
  const criticalPath = await engine.getCriticalPath(projectId);

  return c.json(criticalPath);
});

export default dependencies;

