export type Input = {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: 'PostToolUse' | 'UserPromptSubmit' | 'Stop';
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    command?: string;
    [key: string]: unknown;
  };
  tool_response?: {
    filePath?: string;
    [key: string]: unknown;
  };
};
