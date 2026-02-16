import { Command } from 'commander';
import { withErrorHandler } from '../utils/errors.js';

/**
 * @deprecated Use `eremos content create` instead.
 * This command is maintained for backward compatibility.
 */
export const postCommand = new Command('post')
  .description('[deprecated] Create a post (use `content create` instead)')
  .requiredOption('-t, --title <title>', 'Post title')
  .option('-d, --description <description>', 'Post description')
  .option('-b, --body <body>', 'Post body text')
  .option('-f, --file <file>', 'Read body from file')
  .option('--type <type>', 'Content type (text, image, video, music)', 'text')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--draft', 'Create as draft')
  .action(
    withErrorHandler(async (opts: Record<string, unknown>) => {
      process.stderr.write('Warning: `eremos post` is deprecated. Use `eremos content create` instead.\n');

      // Delegate to content create by re-invoking.
      const { createContentAction } = await import('./content/create.js');
      await createContentAction({
        title: opts.title as string,
        description: opts.description as string | undefined,
        body: opts.body as string | undefined,
        file: opts.file as string | undefined,
        type: (opts.type as string) ?? 'text',
        tags: opts.tags as string | undefined,
        draft: opts.draft as boolean | undefined,
      });
    }),
  );
