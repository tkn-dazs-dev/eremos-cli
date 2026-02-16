import { Command } from 'commander';
import { feedListCommand } from './list.js';
import { feedFollowingCommand } from './following.js';
import { feedPopularCommand } from './popular.js';

export const feedCommand = new Command('feed').description('Feed commands');

feedCommand.addCommand(feedListCommand);
feedCommand.addCommand(feedFollowingCommand);
feedCommand.addCommand(feedPopularCommand);
