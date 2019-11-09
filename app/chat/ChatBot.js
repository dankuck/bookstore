/**
 |----------------------------
 | ChatBot
 |----------------------------
 | A class that holds questions that can be asked and helps to show only the
 | ones that are ready to be asked.
 */

export default class ChatBot {

    constructor(data = {}) {
        this.questions = {};
        this.askedCodes = [];
        Object.assign(this, data);
    }

    add(code, text, conditions = [], onAsk = null, options = {}) {
        if (this.questions[code]) {
            throw new Error(`${code} has already been added`);
        }
        if (!options.keep) {
            // only show this question until it has been asked
            conditions.push(ChatBot.until(code));
        }
        this.questions[code] = {
            onAsk,
            code,
            text,
            conditions,
        };
        return this;
    }

    ask(code) {
        const question = this.questions[code];
        if (!question) {
            throw new Error(`Not found: ${code}`);
        }
        this.askedCodes.push(code);
        question.onAsk && question.onAsk();
    }

    wasAsked(code) {
        return this.askedCodes.includes(code);
    }

    choose() {
        return Object.values(this.questions)
            .filter(question => {
                return question.conditions.reduce((met, condition) => met && condition(this), true);
            });
    }

    getAskedCodes() {
        return this.askedCodes;
    }
};

ChatBot.after = function after(code) {
    return chatbot => chatbot.wasAsked(code);
};

ChatBot.until = function until(code) {
    return chatbot => ! chatbot.wasAsked(code);
};
