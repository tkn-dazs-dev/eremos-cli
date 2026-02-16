import { Command } from 'commander';
import { contentListCommand } from './list.js';
import { contentGetCommand } from './get.js';
import { contentSearchCommand } from './search.js';
import { contentCreateCommand } from './create.js';
import { contentUpdateCommand } from './update.js';
import { contentLikeCommand, contentUnlikeCommand } from './like.js';
import { contentStampsCommand, contentStampCommand, contentUnstampCommand } from './stamp.js';
import { contentReactionsCommand } from './reactions.js';
import { contentCommentsCommand } from './comments.js';
import { contentCommentCommand } from './comment.js';

export const contentCommand = new Command('content').description('Content commands');

contentCommand.addCommand(contentListCommand);
contentCommand.addCommand(contentGetCommand);
contentCommand.addCommand(contentSearchCommand);
contentCommand.addCommand(contentCreateCommand);
contentCommand.addCommand(contentUpdateCommand);
contentCommand.addCommand(contentLikeCommand);
contentCommand.addCommand(contentUnlikeCommand);
contentCommand.addCommand(contentStampsCommand);
contentCommand.addCommand(contentStampCommand);
contentCommand.addCommand(contentUnstampCommand);
contentCommand.addCommand(contentReactionsCommand);
contentCommand.addCommand(contentCommentsCommand);
contentCommand.addCommand(contentCommentCommand);
