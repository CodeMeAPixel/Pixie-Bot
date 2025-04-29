import { getBasePrompt } from './base.js';
import { formattingRules } from './formatting.js';
import { codeRules } from './code.js';
import { identityRules } from './identity.js';
import { behaviorRules } from './behavior.js';
import { historyRules } from './history.js';
import { webSearchRules } from './webSearch.js';

export const generateSystemPrompt = (userContext = {}) => {
    const user = userContext.user || {};
    const guild = userContext.guild || null;
    const channel = userContext.channel || {};

    return [
        getBasePrompt(user, guild, channel),
        formattingRules,
        codeRules,
        identityRules,
        behaviorRules,
        historyRules,
        webSearchRules
    ].join('\n\n');
};
