import { Command } from 'commander';
import { userGetCommand } from './get.js';
import { userOverviewCommand } from './overview.js';
import { userContentsCommand } from './contents.js';
import { userLikesCommand } from './likes.js';
import { userFollowersCommand, userFollowingCommand } from './followers.js';
import { userFollowCommand, userUnfollowCommand } from './follow.js';
import { userSuggestedCommand } from './suggested.js';
import { userUpdateCommand } from './update.js';

export const userCommand = new Command('user').description('User profile commands');

userCommand.addCommand(userGetCommand);
userCommand.addCommand(userOverviewCommand);
userCommand.addCommand(userContentsCommand);
userCommand.addCommand(userLikesCommand);
userCommand.addCommand(userFollowersCommand);
userCommand.addCommand(userFollowingCommand);
userCommand.addCommand(userFollowCommand);
userCommand.addCommand(userUnfollowCommand);
userCommand.addCommand(userSuggestedCommand);
userCommand.addCommand(userUpdateCommand);
