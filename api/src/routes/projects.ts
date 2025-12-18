import { Hono } from 'hono';
import { z } from 'zod';
import { SQLEngine } from '../sql/engine';

const projects = new Hono();

// Get all projects
projects.get('/', async (c) => {
  const supabase = c.get('supabase');
  
  const { data, error } = await supabase
    .from('mantis_project_table')
    .select('id, name, status, description, source_system')
    .eq('enabled', 1)
    .order('name');

  if (error) {
    return c.json({ error: 'Failed to fetch projects' }, 500);
  }

  return c.json({ projects: data });
});

// Get project details with metrics
projects.get('/:projectId', async (c) => {
  const supabase = c.get('supabase');
  const projectId = parseInt(c.req.param('projectId'));

  const engine = new SQLEngine(supabase);
  
  // Get project info
  const { data: project, error } = await supabase
    .from('mantis_project_table')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error || !project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  // Get project metrics
  const metrics = await engine.getProjectMetrics(projectId);

  // Get project tasks
  const tasks = await engine.getProjectTasks(projectId);

  return c.json({
    ...project,
    metrics,
    tasks,
  });
});

// Get project health score
projects.get('/:projectId/health', async (c) => {
  const supabase = c.get('supabase');
  const projectId = parseInt(c.req.param('projectId'));

  const engine = new SQLEngine(supabase);
  const health = await engine.getProjectHealthScore(projectId);

  return c.json(health);
});

// Get project team allocation
projects.get('/:projectId/team', async (c) => {
  const supabase = c.get('supabase');
  const projectId = parseInt(c.req.param('projectId'));

  const engine = new SQLEngine(supabase);
  const allocation = await engine.getProjectTeamAllocation(projectId);

  return c.json(allocation);
});

export default projects;

