import { Command } from 'commander';
import { seriesListCommand } from './list.js';
import { seriesGetCommand } from './get.js';
import { seriesCreateCommand } from './create.js';
import { seriesUpdateCommand } from './update.js';

export const seriesCommand = new Command('series').description('Series commands');

seriesCommand.addCommand(seriesListCommand);
seriesCommand.addCommand(seriesGetCommand);
seriesCommand.addCommand(seriesCreateCommand);
seriesCommand.addCommand(seriesUpdateCommand);
