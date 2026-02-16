import { Command } from 'commander';
import { uploadSignCommand } from './sign.js';
import { uploadThumbnailCommand } from './thumbnail.js';
import { uploadSkillCommand } from './skill.js';
import { uploadFileCommand } from './file.js';

export const uploadCommand = new Command('upload').description('File upload commands');

uploadCommand.addCommand(uploadSignCommand);
uploadCommand.addCommand(uploadThumbnailCommand);
uploadCommand.addCommand(uploadSkillCommand);
uploadCommand.addCommand(uploadFileCommand);
