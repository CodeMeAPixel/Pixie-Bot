import dotenv from 'dotenv';
import Pixie from './client/pixie.js';

dotenv.config();

const client = new Pixie();

client.start();

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);
