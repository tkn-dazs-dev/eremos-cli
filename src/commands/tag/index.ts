import { Command } from 'commander';
import { tagSearchCommand } from './search.js';
import { tagTrendingCommand } from './trending.js';

export const tagCommand = new Command('tag').description('Tag commands');

tagCommand.addCommand(tagSearchCommand);
tagCommand.addCommand(tagTrendingCommand);
