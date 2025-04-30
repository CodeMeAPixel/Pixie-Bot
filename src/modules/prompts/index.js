import { getBasePrompt } from './base.js';
import { formattingRules } from './formatting.js';
import { codeRules } from './code.js';
import { identityRules } from './identity.js';
import { behaviorRules } from './behavior.js';
import { historyRules } from './history.js';
import { webSearchRules } from './webSearch.js';
import { weatherRules } from './weather.js';

export const generateSystemPrompt = (userContext = {}) => {
    const user = userContext.user || {};
    const guild = userContext.guild || null;
    const channel = userContext.channel || {};
    const history = userContext.history || [];

    const baseContext = getBasePrompt(user, guild, channel);
    const isNewConversation = !history.length;

    const contextualPrompt = `
Current Conversation State:
- ${isNewConversation ? 'Starting new conversation' : `Continuing conversation with ${history.length} previous messages`}
- Channel type: ${channel.type || 'unknown'}
- Topic: ${channel.topic || 'None'}`;

    return [
        baseContext,
        contextualPrompt,
        formattingRules,
        behaviorRules,
        historyRules,
        identityRules,
        webSearchRules,
        weatherRules,
        codeRules,
        `Previous context summary: ${isNewConversation ? 'None' : 'Available - refer to conversation history'}`
    ].filter(Boolean).join('\n\n');
};
