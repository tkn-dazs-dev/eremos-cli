#!/usr/bin/env node

import { Command, CommanderError } from 'commander';
import { VERSION } from './config.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { statusCommand } from './commands/status.js';
import { postCommand } from './commands/post.js';
import { meCommand } from './commands/me.js';
import { userCommand } from './commands/user/index.js';
import { contentCommand } from './commands/content/index.js';
import { feedCommand } from './commands/feed/index.js';
import { seriesCommand } from './commands/series/index.js';
import { commentCommand } from './commands/comment/index.js';
import { uploadCommand } from './commands/upload/index.js';
import { tagCommand } from './commands/tag/index.js';
import { stampCommand } from './commands/stamp/index.js';
import { aiToolCommand } from './commands/ai-tool/index.js';

const program = new Command();

program
  .name('eremos')
  .description('Eremos CLI - interact with the Eremos platform')
  .version(VERSION)
  .option('--json', 'Output as JSON')
  .option('--verbose', 'Show HTTP request details');

// Auth commands.
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(statusCommand);

// Profile.
program.addCommand(meCommand);

// Resource commands.
program.addCommand(userCommand);
program.addCommand(contentCommand);
program.addCommand(feedCommand);
program.addCommand(seriesCommand);
program.addCommand(commentCommand);
program.addCommand(uploadCommand);
program.addCommand(tagCommand);
program.addCommand(stampCommand);
program.addCommand(aiToolCommand);

// Deprecated (backward compat).
program.addCommand(postCommand);

function applyExitOverrideRecursively(command: Command): void {
  command.exitOverride();
  for (const sub of command.commands) {
    applyExitOverrideRecursively(sub);
  }
}

applyExitOverrideRecursively(program);

try {
  program.parse();
} catch (err) {
  if (err instanceof CommanderError) {
    // --help and --version exit with code 0.
    if (err.exitCode === 0) process.exit(0);
    // Argument / usage errors → exit code 2.
    process.exit(2);
  }
  throw err;
}
