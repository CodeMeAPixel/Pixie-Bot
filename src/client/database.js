import { log } from "../utils/logger.js";
import { PrismaClient } from "@prisma/client";
import Pixie from "./pixie.js";

const prismaOptions = {
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' }
    ],
    errorFormat: 'minimal'
};

const prisma = new PrismaClient(prismaOptions);

export class db {
    static instance;
    static #isConnecting = false;
    static #isConnected = false;

    constructor() {
        if (db.instance) {
            return db.instance;
        }

        this.prisma = prisma;
        this.bot = Pixie;

        this.prisma.$on('error', (e) => {
            this.logs.error(`Database error: ${e.message}`);
        });

        this.logs = {
            info: msg => log(msg, 'info'),
            error: msg => log(msg, 'error'),
            err: msg => log(msg, 'error'),
            debug: msg => log(msg, 'debug'),
            warn: msg => log(msg, 'warn'),
            done: msg => log(msg, 'done')
        }

        db.instance = this;
    }

    static getInstance() {
        if (!db.instance) {
            db.instance = new db();
        }
        return db.instance;
    }

    async connect() {
        if (db.#isConnecting) {
            this.logs.warn('Database connection already in progress');
            return false;
        }

        if (db.#isConnected) {
            this.logs.warn('Database already connected');
            return true;
        }

        db.#isConnecting = true;

        try {
            // Test connection with timeout
            const connectPromise = this.prisma.$queryRaw`SELECT 1`;
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 5000)
            );

            await Promise.race([connectPromise, timeoutPromise]);
            
            db.#isConnected = true;
            this.logs.done('Database connection is active');
            return true;
        } catch (error) {
            this.logs.error(`Failed to connect to the database: ${error.message}`);
            db.#isConnecting = false;
            return false;
        } finally {
            db.#isConnecting = false;
        }
    }

    async disconnect() {
        if (!db.#isConnected) {
            this.logs.warn('Database already disconnected');
            return true;
        }

        try {
            await this.prisma.$disconnect();
            db.#isConnected = false;
            this.logs.info('Database connection has been closed');
            return true;
        } catch (error) {
            this.logs.error('Failed to disconnect from the database');
            return false;
        }
    }

    async transaction(callback) {
        try {
            return await this.prisma.$transaction(callback, {
                timeout: 5000,
                maxWait: 5000,
                isolationLevel: 'ReadCommitted'
            });
        } catch (error) {
            this.logs.error(`Transaction failed: ${error.message}`);
            throw error;
        }
    }

    get status() {
        return {
            isConnected: db.#isConnected,
            isConnecting: db.#isConnecting
        };
    }
}