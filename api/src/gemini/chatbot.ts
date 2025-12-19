import { SupabaseClient } from '@supabase/supabase-js';
import { UnifiedLLMClient } from '../llm';
import { SQLEngine } from '../sql/engine';
import { WorkloadStateClassifier } from '../sql/workload-states';
import { AuthUser } from '../middleware/auth';
import { CodeRedError } from '../middleware/error';
import { SchemaContextBuilder } from '../sql/schema-context';
import { readFileSync } from 'fs';
import { join } from 'path';

// Simple UUID generator
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export type ChatMode = 'descriptive' | 'diagnostic' | 'prescriptive';

export interface ChatRequest {
  message: string;
  sessionId?: string;
  mode: ChatMode;
  user: AuthUser;
}

export interface ChatResponse {
  sessionId: string;
  message: string;
  mode: ChatMode;
  data?: any;
  sql?: string;
  confidence?: number;
  suggestions?: string[];
}

export class Chatbot {
  private llm: UnifiedLLMClient;
  private sqlEngine: SQLEngine;
  private supabase: SupabaseClient;
  private classifier: WorkloadStateClassifier;

  constructor(llm: UnifiedLLMClient, sqlEngine: SQLEngine, supabase: SupabaseClient) {
    this.llm = llm;
    this.sqlEngine = sqlEngine;
    this.supabase = supabase;
    this.classifier = new WorkloadStateClassifier();
  }

  /**
   * Process a chat message based on mode
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const sessionId = request.sessionId || uuidv4();

    // Save user message to history
    await this.saveMessage(sessionId, request.user.id, 'user', request.message);

    let response: ChatResponse;

    switch (request.mode) {
      case 'descriptive':
        response = await this.handleDescriptive(request, sessionId);
        break;
      case 'diagnostic':
        response = await this.handleDiagnostic(request, sessionId);
        break;
      case 'prescriptive':
        response = await this.handlePrescriptive(request, sessionId);
        break;
      default:
        response = await this.handleDescriptive(request, sessionId);
    }

    // Save assistant response to history
    await this.saveMessage(sessionId, request.user.id, 'assistant', response.message, response.sql);

    return response;
  }

  /**
   * Mode 1: Descriptive - Facts from data
   */
  private async handleDescriptive(request: ChatRequest, sessionId: string): Promise<ChatResponse> {
    // Check if this is a simple query that can use fallback immediately
    const fallbackSql = this.generateFallbackQuery(request.message);
    if (fallbackSql) {
      console.log('Using fallback query generator for simple query');
      try {
        const { data, error } = await this.supabase.rpc('execute_query', { query_text: fallbackSql });
        const results = error ? [] : data;
        const narrative = await this.generateSimpleNarrative(request.message, results);
        return {
          sessionId,
          mode: 'descriptive',
          message: narrative,
          data: results,
          sql: fallbackSql,
        };
      } catch (fallbackError) {
        console.error('Fallback query failed:', fallbackError);
        // Continue to LLM generation if fallback fails
      }
    }
    
    const userContext = await this.buildContext(request.user);
    const schemaContext = SchemaContextBuilder.getFullContext();
    
    // Read SQL_Query_Rules.txt content
    const sqlRulesPath = join(process.cwd(), '..', 'SQL_Query_Rules.txt');
    let sqlRulesContent = '';
    try {
      sqlRulesContent = readFileSync(sqlRulesPath, 'utf-8');
    } catch (error) {
      console.warn('Could not read SQL_Query_Rules.txt, using schema context only');
      sqlRulesContent = SchemaContextBuilder.getSQLRulesContext();
    }

    // Generate SQL from natural language - Using full SQL_Query_Rules.txt
    const sqlPrompt = `You are a SQL expert generating PostgreSQL queries for WorkLens AI.

${schemaContext}

=== ADDITIONAL CRITICAL RULES FROM SQL_Query_Rules.txt ===

${sqlRulesContent}

=== USER QUERY ===
"${request.message}"

=== REQUIREMENTS ===
1. Generate PostgreSQL-compatible SQL (NOT SQL Server T-SQL)
2. Convert SQL Server syntax to PostgreSQL:
   - GETDATE() → CURRENT_DATE or NOW()
   - DATEFROMPARTS() → DATE(year, month, day) or make_date(year, month, day)
   - EOMONTH() → DATE_TRUNC('month', date) + INTERVAL '1 month' - INTERVAL '1 day'
   - CONCAT() → || operator or CONCAT() (both work in PostgreSQL)
   - TRY_CAST() → CAST() or :: operator
   - MAXRECURSION → Not needed in PostgreSQL
3. ALWAYS include source_system in ALL joins
4. ALWAYS convert status/resolution codes to labels using CASE statements
5. For "Bug ID" or "Mantis ID", use column name "mantis_id" and display header as "MANTIS ID"
6. If query is out of domain, set isOutOfDomain: true

You MUST respond with ONLY valid JSON, no other text:
{
  "sql": "SELECT ... (PostgreSQL syntax)",
  "explanation": "Brief description",
  "isOutOfDomain": false
}`;

    let llmResult;
    try {
      llmResult = await this.llm.generate(sqlPrompt);
    } catch (error: any) {
      console.error('LLM generation error:', error.message || error);
      
      // If LLM fails, try fallback query generator
      const fallbackSql = this.generateFallbackQuery(request.message);
      if (fallbackSql) {
        console.log('LLM failed, using fallback query generator');
        try {
          const { data, error } = await this.supabase.rpc('execute_query', { query_text: fallbackSql });
          const results = error ? [] : data;
          const narrative = await this.generateSimpleNarrative(request.message, results);
          return {
            sessionId,
            mode: 'descriptive',
            message: narrative,
            data: results,
            sql: fallbackSql,
          };
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
        }
      }
      
      return {
        sessionId,
        mode: 'descriptive',
        message: `I encountered an error: ${error.message || 'Failed to generate response'}. Please check your AI provider settings.`,
        suggestions: [
          'Show all active tasks across the team',
          'What is the team bandwidth this week?',
          'List overdue tasks',
        ],
      };
    }
    
    // Log the raw response for debugging
    console.log('LLM Response (first 1000 chars):', llmResult.content.substring(0, 1000));
    
    if (!llmResult || !llmResult.content) {
      console.error('Empty LLM response');
      return {
        sessionId,
        mode: 'descriptive',
        message: 'I received an empty response. Please try again.',
        suggestions: [
          'Show all active tasks across the team',
          'What is the team bandwidth this week?',
          'List overdue tasks',
        ],
      };
    }
    
    // Try to extract JSON - be more flexible with parsing
    let jsonMatch = llmResult.content.match(/\{[\s\S]*\}/);
    
    // If no JSON found, try to find it in code blocks
    if (!jsonMatch) {
      const codeBlockMatch = llmResult.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonMatch = [codeBlockMatch[1]];
      }
    }
    
    if (!jsonMatch) {
      console.error('No JSON found in LLM response. Full response:', llmResult.content);
      // Try to provide a helpful response even without JSON
      if (llmResult.content.toLowerCase().includes('code red') || llmResult.content.toLowerCase().includes('out of domain')) {
        throw new CodeRedError();
      }
      
      // Fallback: Try to generate a simple query based on keywords
      const fallbackSql = this.generateFallbackQuery(request.message);
      if (fallbackSql) {
        console.log('Using fallback query generator');
        try {
          const { data, error } = await this.supabase.rpc('execute_query', { query_text: fallbackSql });
          const results = error ? [] : data;
          const narrative = await this.generateSimpleNarrative(request.message, results);
          return {
            sessionId,
            mode: 'descriptive',
            message: narrative,
            data: results,
            sql: fallbackSql,
          };
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
        }
      }
      
      return {
        sessionId,
        mode: 'descriptive',
        message: 'I couldn\'t parse the response. The AI might be having issues. Please try rephrasing your question.',
        suggestions: [
          'Show all active tasks across the team',
          'What is the team bandwidth this week?',
          'List overdue tasks',
        ],
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError.message, 'Attempted to parse:', jsonMatch[0].substring(0, 200));
      
      // Try fallback on JSON parse error
      const fallbackSql = this.generateFallbackQuery(request.message);
      if (fallbackSql) {
        console.log('JSON parse failed, using fallback query generator');
        try {
          const { data, error } = await this.supabase.rpc('execute_query', { query_text: fallbackSql });
          const results = error ? [] : data;
          const narrative = await this.generateSimpleNarrative(request.message, results);
          return {
            sessionId,
            mode: 'descriptive',
            message: narrative,
            data: results,
            sql: fallbackSql,
          };
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
        }
      }
      
      return {
        sessionId,
        mode: 'descriptive',
        message: 'I encountered an error processing the AI response. Please try rephrasing your question.',
        suggestions: [
          'Show all active tasks across the team',
          'What is the team bandwidth this week?',
          'List overdue tasks',
        ],
      };
    }
    
    if (parsed.isOutOfDomain || parsed.explanation === 'code red') {
      throw new CodeRedError();
    }

    if (!parsed.sql || parsed.sql.trim() === '') {
      console.error('No SQL in parsed response:', parsed);
      
      // Try fallback when SQL is empty
      const fallbackSql = this.generateFallbackQuery(request.message);
      if (fallbackSql) {
        console.log('No SQL in response, using fallback query generator');
        try {
          const { data, error } = await this.supabase.rpc('execute_query', { query_text: fallbackSql });
          const results = error ? [] : data;
          const narrative = await this.generateSimpleNarrative(request.message, results);
          return {
            sessionId,
            mode: 'descriptive',
            message: narrative,
            data: results,
            sql: fallbackSql,
          };
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
        }
      }
      
      return {
        sessionId,
        mode: 'descriptive',
        message: 'I couldn\'t generate a valid query for that. Please try a different question.',
        suggestions: [
          'Show all active tasks across the team',
          'What is the team bandwidth this week?',
          'List overdue tasks',
        ],
      };
    }

    const { sql, explanation } = parsed;
    console.log('Generated SQL:', sql.substring(0, 200) + '...');
    
    try {
      const { data, error } = await this.supabase.rpc('execute_query', { query_text: sql });
      const results = error ? await this.executeDirectQuery(sql) : data;

      // Generate narrative from results
      const narrativePrompt = `You are WorkLens AI, an enterprise workload intelligence assistant.
Generate a concise, insightful narrative (2-4 sentences) explaining the current workload situation.

QUESTION: "${request.message}"
SQL EXPLANATION: "${explanation}"
RESULTS: ${JSON.stringify(results, null, 2)}

GUIDELINES:
- Focus on "why" not just "what"
- Highlight risks or opportunities
- Be specific with numbers
- Use professional but conversational tone

Generate the narrative:`;

      const narrativeResult = await this.llm.generate(narrativePrompt);

      return {
        sessionId,
        mode: 'descriptive',
        message: narrativeResult.content.trim(),
        data: results,
        sql,
      };
    } catch (error) {
      console.error('Query execution error:', error);
      return {
        sessionId,
        mode: 'descriptive',
        message: 'I found the right query but couldn\'t execute it. Please try again.',
        sql,
      };
    }
  }

  /**
   * Mode 2: Diagnostic - Multi-step reasoning
   */
  private async handleDiagnostic(request: ChatRequest, sessionId: string): Promise<ChatResponse> {
    const { user, message } = request;

    // Detect question type and gather relevant data
    const questionType = this.classifyQuestion(message);
    let diagnosticData: any = {};

    switch (questionType) {
      case 'bandwidth':
        if (user.employeeId) {
          const metrics = await this.sqlEngine.getResourceWorkloadMetrics({
            period: 'week',
            employeeId: user.employeeId,
          });
          const tasks = await this.sqlEngine.getResourceTasks(user.employeeId, { activeOnly: true });
          const classification = metrics[0] ? this.classifier.classifyWithReasoning(metrics[0]) : null;
          
          diagnosticData = {
            metrics: metrics[0],
            classification,
            tasks,
            taskTypeBreakdown: this.groupByTaskType(tasks),
          };
        }
        break;

      case 'risk':
        const { data: alerts } = await this.supabase
          .from('risk_alerts')
          .select('*')
          .eq('is_resolved', false)
          .limit(10);
        
        diagnosticData = {
          activeAlerts: alerts,
          alertCount: alerts?.length || 0,
        };
        break;

      case 'project':
        // Extract project name from question and get metrics
        const projectMetrics = await this.sqlEngine.getProjectsSummary();
        diagnosticData = { projects: projectMetrics };
        break;

      default:
        // General diagnostic
        if (user.employeeId) {
          const metrics = await this.sqlEngine.getResourceWorkloadMetrics({
            period: 'week',
            employeeId: user.employeeId,
          });
          diagnosticData = { metrics: metrics[0] };
        }
    }

    // Use LLM to synthesize diagnostic answer
    const diagnosticPrompt = `You are WorkLens AI diagnostic assistant. Answer the user's question using the provided data.

QUESTION: "${message}"

DATA:
${JSON.stringify(diagnosticData, null, 2)}

Provide a diagnostic response ONLY in JSON:
{
  "answer": "Clear, specific answer with numbers and context (2-4 sentences)",
  "confidence": 0.0-1.0,
  "dataPoints": ["key fact 1", "key fact 2", "key fact 3"]
}`;

    const diagResult = await this.llm.generate(diagnosticPrompt);
    const jsonMatch = diagResult.content.match(/\{[\s\S]*\}/);
    
    let diagParsed = { answer: 'Unable to generate diagnostic at this time.', confidence: 0, dataPoints: [] };
    if (jsonMatch) {
      try {
        diagParsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse diagnostic JSON:', e);
      }
    }

    return {
      sessionId,
      mode: 'diagnostic',
      message: diagParsed.answer,
      confidence: diagParsed.confidence,
      data: {
        dataPoints: diagParsed.dataPoints,
        rawData: diagnosticData,
      },
    };
  }

  /**
   * Mode 3: Prescriptive - Recommendations
   */
  private async handlePrescriptive(request: ChatRequest, sessionId: string): Promise<ChatResponse> {
    const { user, message } = request;

    // Build comprehensive context
    let context = '';
    
    if (user.employeeId) {
      const metrics = await this.sqlEngine.getResourceWorkloadMetrics({
        period: 'week',
        employeeId: user.employeeId,
      });
      const tasks = await this.sqlEngine.getResourceTasks(user.employeeId, { activeOnly: true });
      const classification = metrics[0] ? this.classifier.classifyWithReasoning(metrics[0]) : null;

      context = `
Current State for ${metrics[0]?.employeeName || 'User'}:
- Workload State: ${classification?.state || 'Unknown'}
- Availability: ${metrics[0]?.availabilityPct || 0}%
- Remaining ETA: ${metrics[0]?.yetToSpend || 0}h
- Active Tasks: ${tasks.length}

Tasks by Type:
${JSON.stringify(this.groupByTaskType(tasks), null, 2)}

Classification Reasons:
${classification?.reasons.join('\n') || 'N/A'}
`;
    }

    // Get team context if manager+
    if (['manager', 'program_manager', 'leadership'].includes(user.role)) {
      const teamMetrics = await this.sqlEngine.getResourceWorkloadMetrics({ period: 'week' });
      const teamHealth = this.classifier.calculateTeamHealth(
        teamMetrics.map(m => this.classifier.classify(m))
      );

      context += `

Team Overview:
- Team Health Score: ${teamHealth.healthScore}
- Distribution: ${JSON.stringify(teamHealth.distribution)}
- Alerts: ${teamHealth.alerts.join('; ')}
`;
    }

    // Generate recommendations
    const prescriptivePrompt = `You are WorkLens AI prescriptive assistant. Generate actionable recommendations.

CURRENT CONTEXT:
${context}

USER GOAL: "${message}"

Provide recommendations ONLY in JSON:
{
  "recommendations": [
    {
      "action": "Specific action to take",
      "impact": "Expected outcome",
      "priority": "high" | "medium" | "low"
    }
  ],
  "rationale": "Brief explanation of the recommendation strategy"
}

Limit to 3-5 most impactful recommendations.`;

    const prescriptiveResult = await this.llm.generate(prescriptivePrompt);
    const jsonMatch = prescriptiveResult.content.match(/\{[\s\S]*\}/);
    
    let presParsed = { recommendations: [], rationale: 'Default recommendation.' };
    if (jsonMatch) {
      try {
        presParsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse prescriptive JSON:', e);
      }
    }

    // Format response
    const formattedRecommendations = presParsed.recommendations
      .map((r: any, i: number) => `${i + 1}. **${r.action}**\n   Impact: ${r.impact}\n   Priority: ${r.priority}`)
      .join('\n\n');

    return {
      sessionId,
      mode: 'prescriptive',
      message: formattedRecommendations ? `Based on your current workload:\n\n${formattedRecommendations}\n\n*${presParsed.rationale}*` : 'Unable to generate recommendations.',
      data: presParsed,
    };
  }

  /**
   * Build context string for SQL generation
   */
  private async buildContext(user: AuthUser): Promise<string> {
    let context = `User: ${user.email}, Role: ${user.role}`;
    
    if (user.employeeId) {
      const { data: employee } = await this.supabase
        .from('hs_hr_employee')
        .select('emp_firstname, emp_lastname')
        .eq('emp_number', user.employeeId)
        .single();
      
      if (employee) {
        context += `, Name: ${employee.emp_firstname} ${employee.emp_lastname}`;
      }
    }

    // Add permission context
    if (user.role === 'individual_contributor') {
      context += '\nPermission: Can only query own data';
    } else {
      context += '\nPermission: Can query team/org data';
    }

    return context;
  }

  /**
   * Classify question type for diagnostic routing
   */
  private classifyQuestion(question: string): string {
    const lower = question.toLowerCase();
    
    if (lower.includes('bandwidth') || lower.includes('availability') || lower.includes('capacity')) {
      return 'bandwidth';
    }
    if (lower.includes('risk') || lower.includes('alert') || lower.includes('warning')) {
      return 'risk';
    }
    if (lower.includes('project') || lower.includes('delivery')) {
      return 'project';
    }
    if (lower.includes('team') || lower.includes('members')) {
      return 'team';
    }
    
    return 'general';
  }

  /**
   * Group tasks by task type
   */
  private groupByTaskType(tasks: any[]): Record<string, { count: number; totalEta: number }> {
    const grouped: Record<string, { count: number; totalEta: number }> = {};
    
    tasks.forEach(task => {
      const type = task.taskType || 'Unknown';
      if (!grouped[type]) {
        grouped[type] = { count: 0, totalEta: 0 };
      }
      grouped[type].count++;
      grouped[type].totalEta += parseFloat(task.eta) || 0;
    });

    return grouped;
  }

  /**
   * Execute direct query (fallback)
   */
  private async executeDirectQuery(sql: string): Promise<any[]> {
    // For security, only allow SELECT queries
    if (!sql.trim().toLowerCase().startsWith('select')) {
      return [];
    }

    // This is a simplified fallback - in production you'd want proper SQL execution
    // For now, return empty and rely on the narrative generation
    return [];
  }

  /**
   * Generate a fallback SQL query based on common patterns
   */
  private generateFallbackQuery(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // Active tasks query - match more patterns
    if (lowerMessage.includes('active task') || 
        lowerMessage.includes('current task') || 
        lowerMessage.includes('show task') || 
        lowerMessage.includes('all task') ||
        lowerMessage.includes('list task') ||
        (lowerMessage.includes('task') && (lowerMessage.includes('show') || lowerMessage.includes('all') || lowerMessage.includes('list') || lowerMessage.includes('across')))) {
      return `SELECT 
  b.id AS mantis_id,
  b.summary AS task_summary,
  p.name AS project_name,
  CASE 
    WHEN b.status = 10 THEN 'New'
    WHEN b.status = 20 THEN 'Feedback'
    WHEN b.status = 30 THEN 'Acknowledged'
    WHEN b.status = 40 THEN 'Confirmed'
    WHEN b.status = 50 THEN 'Assigned'
    WHEN b.status = 60 THEN 'Movedout'
    WHEN b.status = 70 THEN 'Deferred'
    WHEN b.status = 80 THEN 'Resolved'
    WHEN b.status = 90 THEN 'Closed'
    WHEN b.status = 100 THEN 'Reopen'
    ELSE 'Unknown'
  END AS status_label,
  CASE 
    WHEN b.resolution = 10 THEN 'Open'
    WHEN b.resolution = 20 THEN 'Fixed'
    WHEN b.resolution = 30 THEN 'Reopened'
    WHEN b.resolution = 40 THEN 'Unable to Reproduce'
    WHEN b.resolution = 50 THEN 'Duplicate'
    WHEN b.resolution = 60 THEN 'No Change Required'
    WHEN b.resolution = 70 THEN 'Not Fixable'
    WHEN b.resolution = 80 THEN 'Suspended'
    WHEN b.resolution = 90 THEN 'Won''t Fix'
    ELSE 'Open'
  END AS resolution_label,
  e.emp_firstname || ' ' || e.emp_lastname AS assigned_to
FROM mantis_bug_table b
JOIN mantis_project_table p ON b.project_id = p.id AND b.source_system = p.source_system
JOIN mantis_user_table u ON b.handler_id = u.id AND b.source_system = u.source_system
LEFT JOIN hs_hr_employee e ON LOWER(TRIM(u.email)) = LOWER(TRIM(e.emp_work_email))
WHERE b.source_system = 'mantis'
  AND b.status NOT IN (80, 90)
ORDER BY b.last_updated DESC
LIMIT 50`;
    }
    
    // Team bandwidth query - per SQL_Query_Rules.txt output formatting (lines 283-287)
    if (lowerMessage.includes('bandwidth') || lowerMessage.includes('capacity')) {
      return `SELECT 
  p.name AS project,
  cf.value AS task_type,
  e.emp_firstname || ' ' || e.emp_lastname AS resource_name,
  ROUND(SUM(CAST(COALESCE(eta.value, '0') AS NUMERIC)), 2) AS "ETA(h)",
  ROUND(SUM(COALESCE(n.time_tracking, 0)) / 60.0, 2) AS "TIME SPENT(h)",
  ROUND(GREATEST(0, 40 - (SUM(CAST(COALESCE(eta.value, '0') AS NUMERIC)) - SUM(COALESCE(n.time_tracking, 0)) / 60.0))), 2) AS "REMAINING BANDWIDTH(h)",
  ROUND((SUM(COALESCE(n.time_tracking, 0)) / 60.0 / 40.0) * 100, 2) AS "UTILIZATION(%)",
  ROUND((GREATEST(0, 40 - (SUM(CAST(COALESCE(eta.value, '0') AS NUMERIC)) - SUM(COALESCE(n.time_tracking, 0)) / 60.0))) / 40.0 * 100, 2) AS "AVAILABILITY(%)"
FROM mantis_bug_table b
JOIN mantis_project_table p ON b.project_id = p.id AND b.source_system = p.source_system
JOIN mantis_user_table u ON b.handler_id = u.id AND b.source_system = u.source_system
JOIN hs_hr_employee e ON LOWER(TRIM(u.email)) = LOWER(TRIM(e.emp_work_email))
LEFT JOIN mantis_custom_field_string_table eta ON b.id = eta.bug_id AND eta.field_id = 4 AND b.source_system = eta.source_system
LEFT JOIN mantis_custom_field_string_table cf ON b.id = cf.bug_id AND cf.field_id IN (40, 54) AND b.source_system = cf.source_system
LEFT JOIN (
  SELECT bug_id, source_system, SUM(time_tracking) AS time_tracking
  FROM mantis_bugnote_table
  GROUP BY bug_id, source_system
) n ON b.id = n.bug_id AND b.source_system = n.source_system
WHERE b.source_system = 'mantis'
  AND b.status NOT IN (80, 90)
GROUP BY p.name, cf.value, e.emp_firstname, e.emp_lastname
ORDER BY "REMAINING BANDWIDTH(h)" ASC
LIMIT 50;`;
    }
    
    return null;
  }

  /**
   * Generate a simple narrative from query results
   */
  private async generateSimpleNarrative(question: string, results: any[]): Promise<string> {
    if (!results || results.length === 0) {
      return 'I found no results for your query. The database might be empty or the filters are too restrictive.';
    }
    
    const count = results.length;
    const firstResult = results[0];
    
    if (question.toLowerCase().includes('task')) {
      return `I found ${count} active task${count !== 1 ? 's' : ''} across the team. ${count > 0 ? `The most recent task is "${firstResult.task_summary || firstResult.summary || 'N/A'}" in project "${firstResult.project_name || 'N/A'}".` : ''}`;
    }
    
    if (question.toLowerCase().includes('bandwidth') || question.toLowerCase().includes('capacity')) {
      const totalEta = results.reduce((sum, r) => sum + (parseFloat(r.total_eta_hours) || 0), 0);
      const totalSpent = results.reduce((sum, r) => sum + (parseFloat(r.time_spent_hours) || 0), 0);
      return `I found workload data for ${count} team member${count !== 1 ? 's' : ''}. Total ETA: ${totalEta.toFixed(1)} hours, Time Spent: ${totalSpent.toFixed(1)} hours.`;
    }
    
    return `I found ${count} result${count !== 1 ? 's' : ''} for your query.`;
  }

  /**
   * Save message to chat history
   */
  private async saveMessage(
    sessionId: string,
    userId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    sql?: string
  ): Promise<void> {
    await this.supabase.from('chat_history').insert({
      session_id: sessionId,
      user_id: userId,
      role,
      content,
      sql_query: sql,
    });
  }
}

